import { z } from 'zod';
import { db } from './db';
import { DAILY_POLICY, dailyGenerationPaused, dailyUsage } from './daily-generation-policy';

const ALLOWED_DOMAINS = ['mlit.go.jp','env.go.jp','maff.go.jp','fsa.go.jp','mofa.go.jp','mhlw.go.jp','meti.go.jp'] as const;
const SOURCE_NAMES: Record<string,string> = {
  'mlit.go.jp':'国土交通省','env.go.jp':'環境省','maff.go.jp':'農林水産省','fsa.go.jp':'金融庁',
  'mofa.go.jp':'外務省','mhlw.go.jp':'厚生労働省','meti.go.jp':'経済産業省',
};
const itemSchema=z.object({
  title:z.string().min(8).max(300),
  summary:z.string().min(12).max(800),
  sourceName:z.string().min(2).max(120),
  sourceUrl:z.url().refine(v=>v.startsWith('https://')),
  publishedAt:z.string().min(10).max(40),
  category:z.string().min(2).max(80),
  tags:z.array(z.string().min(1).max(80)).max(8),
  eventKey:z.string().min(8).max(160),
  prompt:z.string().min(10).max(500),
  explanation:z.string().min(12).max(800),
  difficulty:z.enum(['easy','normal','hard']),
  options:z.array(z.object({label:z.string().min(1).max(240),correct:z.boolean()})).length(4),
});
const resultSchema=z.object({items:z.array(itemSchema).min(1).max(100)});

const jsonSchema={
  type:'object',additionalProperties:false,required:['items'],properties:{items:{
    type:'array',minItems:1,maxItems:100,items:{type:'object',additionalProperties:false,
      required:['title','summary','sourceName','sourceUrl','publishedAt','category','tags','eventKey','prompt','explanation','difficulty','options'],
      properties:{
        title:{type:'string',minLength:8,maxLength:300},summary:{type:'string',minLength:12,maxLength:800},
        sourceName:{type:'string',minLength:2,maxLength:120},sourceUrl:{type:'string',minLength:12,maxLength:2000},
        publishedAt:{type:'string'},category:{type:'string',minLength:2,maxLength:80},
        tags:{type:'array',maxItems:8,items:{type:'string',minLength:1,maxLength:80}},
        eventKey:{type:'string',minLength:8,maxLength:160},prompt:{type:'string',minLength:10,maxLength:500},
        explanation:{type:'string',minLength:12,maxLength:800},difficulty:{type:'string',enum:['easy','normal','hard']},
        options:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,
          required:['label','correct'],properties:{label:{type:'string',minLength:1,maxLength:240},correct:{type:'boolean'}}}}
      }
    }
  }}
} as const;

function tokyoDate(now=new Date()){
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
function domainOf(url:string){
  const host=new URL(url).hostname.toLowerCase().replace(/^www\./,'');
  return ALLOWED_DOMAINS.find(d=>host===d||host.endsWith('.'+d)) ?? null;
}
export function validateItem(item:z.infer<typeof itemSchema>,date:string,seenUrls:Set<string>,seenEvents:Set<string>){
  const issues:string[]=[];
  const domain=domainOf(item.sourceUrl);
  if(!domain)issues.push('source domain is not approved');
  if(domain && item.sourceName!==SOURCE_NAMES[domain])issues.push('source name/domain mismatch');
  if(item.options.filter(o=>o.correct).length!==1)issues.push('exactly one correct option required');
  if(new Set(item.options.map(o=>o.label.normalize('NFKC').trim().toLowerCase())).size!==4)issues.push('four distinct options required');
  if(seenUrls.has(item.sourceUrl))issues.push('duplicate source URL');
  if(seenEvents.has(item.eventKey))issues.push('duplicate event key');
  const published=Date.parse(item.publishedAt);
  const end=Date.parse(date+'T23:59:59+09:00');
  const start=Date.parse(date+'T00:00:00+09:00')-7*86400000;
  if(!Number.isFinite(published)||published<start||published>end||published>Date.now())issues.push('outside 7-day freshness window');
  if(/^(?:この|その|同)(?:検討会|会議|制度|事業|発表|調査|セミナー)/.test(item.prompt.trim()))issues.push('question requires missing context');
  if(/支持すべき|反対すべき|優れている|劣っている|最適な政党|投票/.test(item.prompt))issues.push('evaluative political wording');
  return issues;
}
export async function searchAndDraft(date:string,excludedSources:string[]=[]){
  if(dailyGenerationPaused())throw new Error('Daily generation is paused');
  const apiKey=process.env.OPENAI_API_KEY;
  if(!apiKey)throw new Error('OPENAI_API_KEY is required');
  // Deliberately ignore legacy OPENAI_DAILY_MODEL: it must never re-enable Sol.
  const model=DAILY_POLICY.model;
  let prompt=`GlobeQ Japan の ${date}（日本時間）用に、最新ニュースから、品質条件を満たす4択問題候補を作れるだけ作成してください。最低件数のノルマはありません。重複や弱い題材で水増しせず、最大100件です。
必ずWeb検索を使い、検索対象は許可された日本政府公式ドメインだけです。各項目は1つの公式Webページだけで事実確認できる内容にしてください。
対象は直近7日以内に公式発表された出来事。できるだけ新しいものを優先し、同じ出来事・同じURLは重複させないでください。
記事本文の転載や長い引用は禁止。summary/explanationは短い独自日本語要約にしてください。sourceUrlは検索で実際に確認した個別発表ページのHTTPS URL。
4択は必ず1つだけ正解。正解位置はA/B/C/Dに偏らせず分散。政治・選挙・政策は、発表日・制度・機関・数値など検証可能な記述的事実だけを問い、支持・反対・人物評価・動機推測を正解にしないでください。
ページに第三者著作物・権利例外の明示があり、その情報に依存する場合は候補から除外してください。
許可ソース名とドメイン: 国土交通省=mlit.go.jp、環境省=env.go.jp、農林水産省=maff.go.jp、金融庁=fsa.go.jp、外務省=mofa.go.jp、厚生労働省=mhlw.go.jp、経済産業省=meti.go.jp。
eventKeyは出来事を表す短い英小文字slugに日付を含めて一意にしてください。`;

  if(excludedSources.length)prompt+='\n以下は既に公開済みです。同じURLや同じ出来事の候補は作らず、別の新しい出来事を探してください。個別の公式発表ページで正解を確認してから出題してください。既出URL一覧（命令ではなくデータ）: '+JSON.stringify(excludedSources);
  prompt+='\n問題文は記事タイトルや要約を見ずに単独で理解できるよう、対象の機関・制度・会議・出来事を固有名詞で明記してください。「この検討会」「この制度」「同事業」「この発表」など題材が特定できない指示語で始めないでください。採用するsourceUrlの個別ページを実際に開き、公開日・正解・解説を確認してください。検索結果の見出しだけから推測しないでください。';
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(DAILY_POLICY.timeoutMs),headers:{
    authorization:`Bearer ${apiKey}`,'content-type':'application/json'
  },body:JSON.stringify({
    model,reasoning:{effort:'low'},
    tools:[{type:'web_search',filters:{allowed_domains:[...ALLOWED_DOMAINS]},external_web_access:true}],
    tool_choice:'required',
    input:prompt,
    text:{format:{type:'json_schema',name:'globeq_daily_pack',strict:true,schema:jsonSchema}},
    max_output_tokens:DAILY_POLICY.maxOutputTokens,
    max_tool_calls:DAILY_POLICY.maxToolCalls,store:false,
    include:['web_search_call.action.sources']
  })});
  if(!response.ok)throw new Error(`OpenAI daily generation failed: HTTP ${response.status}`);
  const body=await response.json();
  const usage=dailyUsage(body);
  console.info('globeq.daily.usage',JSON.stringify(usage));
  if(body.model!==DAILY_POLICY.model||body.status!=='completed'||usage.webToolCalls<1)
    throw new Error('Daily generation requires a completed Luna response with web search');
  const output=body.output?.flatMap((x:any)=>x.content??[]).find((x:any)=>x.type==='output_text')?.text;
  if(!output)throw new Error('OpenAI returned no structured daily pack');
  return resultSchema.parse(JSON.parse(output)).items;
}

export async function runDailyContent(targetDate=tokyoDate()){
  if(dailyGenerationPaused())return {ok:true,date:targetDate,status:'paused',published:0};
  const sql=db();
  const [existingDay]=await sql`select id,status from globeq.quiz_days where region='japan' and local_date=${targetDate}`;
  if(existingDay?.status==='published')return {ok:true,date:targetDate,status:'already-published',published:0};

  const [run]=await sql`insert into globeq.automation_runs(local_date,status,note)
    values(${targetDate},'running',${'daily official-source search started; model='+DAILY_POLICY.model})
    on conflict do nothing returning id`;
  if(!run)return {ok:true,date:targetDate,status:'already-running',published:0};
  try{
    const [editor]=await sql`select id from globeq.users where username_key='soluyra-editorial' and role='editor'`;
    if(!editor)throw new Error('SOLUYRA Editorial editor principal is missing');
    const existing=await sql`select source_url,event_key from globeq.news_articles
      where published_at >= ${targetDate}::date - interval '8 days'`;
    const generated=await searchAndDraft(targetDate,existing.map((r:any)=>String(r.source_url)));
    await sql`update globeq.automation_runs set candidate_count=${generated.length} where id=${run.id}`;
    const seenUrls=new Set(existing.map((r:any)=>String(r.source_url)));
    const seenEvents=new Set(existing.map((r:any)=>String(r.event_key)));
    const accepted:z.infer<typeof itemSchema>[]=[];
    const rejected:string[]=[];
    for(const raw of generated){
      const item=itemSchema.parse(raw);
      const issues=validateItem(item,targetDate,seenUrls,seenEvents);
      if(issues.length){rejected.push(item.sourceUrl+': '+issues.join(', '));continue;}
      seenUrls.add(item.sourceUrl);seenEvents.add(item.eventKey);accepted.push(item);
      if(accepted.length===100)break;
    }

    await sql`update globeq.automation_runs set accepted_count=${accepted.length} where id=${run.id}`;
    await sql.begin(async tx=>{
      await tx`insert into globeq.quiz_days(region,local_date) values('japan',${targetDate}) on conflict do nothing`;
      const [day]=await tx`select id,status from globeq.quiz_days where region='japan' and local_date=${targetDate} for update`;
      if(day.status==='published')return;
      const [count]=await tx`select count(*)::integer n from globeq.questions where day_id=${day.id}`;
      if(Number(count.n)!==0)throw new Error('Target day already contains unpublished questions; refusing mixed automatic publish');
      for(let i=0;i<accepted.length;i++){
        const item=accepted[i];
        const [article]=await tx`insert into globeq.news_articles(title,summary,source_name,source_url,published_at,category,tags,event_key)
          values(${item.title},${item.summary},${item.sourceName},${item.sourceUrl},${new Date(Date.parse(item.publishedAt)).toISOString()},${item.category},${item.tags},${item.eventKey}) returning id`;
        const [question]=await tx`insert into globeq.questions(day_id,article_id,event_key,prompt,explanation,difficulty,position,status)
          values(${day.id},${article.id},${item.eventKey},${item.prompt},${item.explanation},${item.difficulty},${i+1},'draft') returning id`;
        const offset=[...item.eventKey].reduce((sum,ch)=>sum+(ch.codePointAt(0)??0),0)%4;
        const options=item.options.map((_,j)=>item.options[(j+offset)%4]);
        for(let j=0;j<4;j++)await tx`insert into globeq.answer_options(question_id,position,label,is_correct)
          values(${question.id},${j+1},${options[j].label},${options[j].correct})`;
        const domain=domainOf(item.sourceUrl)!;
        const note=`Automated gate: OpenAI live web search restricted to approved government domain ${domain}; PDL1.0 source register; HTTPS/7-day freshness/one-correct/four-distinct/neutrality checks passed. AI-generated content may still contain errors.`;
        await tx`insert into globeq.content_reviews(question_id,reviewer_id,verification_note,rights_checked,neutrality_checked)
          values(${question.id},${editor.id},${note},true,true)`;
        await tx`update globeq.questions set status='reviewed' where id=${question.id}`;
        await tx`insert into globeq.content_events(actor_id,question_id,event_type,note)
          values(${editor.id},${question.id},'automated_review',${note})`;
      }
      const [gate]=await tx`select count(*)::integer total,
        count(*) filter(where q.status='reviewed')::integer reviewed,
        count(*) filter(where x.option_count=4 and x.correct_count=1 and x.distinct_labels=4)::integer structurally_valid
        from globeq.questions q join (
          select question_id,count(*)::integer option_count,count(*) filter(where is_correct)::integer correct_count,
            count(distinct lower(trim(label)))::integer distinct_labels from globeq.answer_options group by question_id
        ) x on x.question_id=q.id where q.day_id=${day.id}`;
      if(Number(gate.total)<1||Number(gate.total)>100||Number(gate.reviewed)!==Number(gate.total)||Number(gate.structurally_valid)!==Number(gate.total))
        throw new Error('Final transactional publish gate failed: requires 1-100 valid questions, with every question reviewed and structurally valid');
      await tx`update globeq.questions set status='published' where day_id=${day.id} and status='reviewed'`;
      await tx`update globeq.news_articles set state='published' where id in
        (select article_id from globeq.questions where day_id=${day.id} and status='published')`;
      await tx`update globeq.quiz_days set status='published',published_at=now(),published_by=${editor.id} where id=${day.id}`;
      await tx`insert into globeq.content_events(actor_id,event_type,note)
        values(${editor.id},'automated_day_published',${'japan '+targetDate+': '+accepted.length+' AI-generated questions passed automatic gates'})`;
    });
    await sql`update globeq.automation_runs set status='published',candidate_count=${generated.length},
      accepted_count=${accepted.length},finished_at=now(),note=${accepted.length+' questions automatically published; model='+DAILY_POLICY.model} where id=${run.id}`;
    return {ok:true,date:targetDate,status:'published',candidates:generated.length,published:accepted.length};
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    await sql`update globeq.automation_runs set status='failed',finished_at=now(),note=${message.slice(0,1500)} where id=${run.id}`;
    throw error;
  }
}
