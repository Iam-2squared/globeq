/** One review-capable Luna trial. Draft payload is encrypted before leaving memory. */
import { createCipheriv, createHash, createPublicKey, publicEncrypt, randomBytes, constants } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const MODEL='gpt-6-luna', MAX_TOOLS=8, MAX_OUTPUT=16000;
const ENDPOINT='https://api.openai.com/v1/responses';
export function seal(value, pem) {
  const key=randomBytes(32), iv=randomBytes(12);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  const wrapped=publicEncrypt({key:pem,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
  key.fill(0);
  return {version:1,algorithm:'RSA-OAEP-SHA256+AES-256-GCM',key:wrapped.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
}
export function estimate(usage, tools) {
  const i=usage?.input_tokens,o=usage?.output_tokens,c=usage?.input_tokens_details?.cached_tokens??0,w=usage?.input_tokens_details?.cache_write_tokens??0;
  if(![i,o,c,w,tools].every(x=>Number.isSafeInteger(x)&&x>=0)||c+w>i||i>272000)return null;
  const model=((i-c-w)*100+c*10+w*125+o*500)/1e9;
  return {model_usd:model,search_upper_usd:tools*0.01,total_upper_usd:model+tools*0.01,invoice_verified:false};
}
export async function review({apiKey,pem,fetchImpl=globalThis.fetch,load,excludedSources=[]}) {
  const report={observed_at:new Date().toISOString(),mode:'encrypted-unpublished-review',model_requested:MODEL,target_date:'2026-09-29',request_count:0,production_writes:0,published:0,max_tool_calls:MAX_TOOLS,max_output_tokens:MAX_OUTPUT,independent_fact_review:'pending',retry_performed:false};
  let privatePayload=null,stage='preflight';
  try {
    if(!apiKey)throw new Error('MISSING_KEY');
    const key=createPublicKey(pem);
    if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<3072)throw new Error('BAD_REVIEW_KEY');
    if(!load)load=(await import('./runner.mjs')).loadGenerator;
    const transport=async(url,init)=>{
      if(report.request_count!==0||url!==ENDPOINT||init?.method!=='POST')throw new Error('REQUEST_BLOCKED');
      const p=JSON.parse(init.body);
      if(p.model!==MODEL||p.tools?.length!==1||p.tools[0].type!=='web_search')throw new Error('MODEL_OR_TOOL_BLOCKED');
      if(excludedSources.length)p.input+='\n以下は既に公開済みです。同じURLや同じ出来事の候補は作らず、別の新しい出来事を探してください。個別の公式発表ページで正解を確認してから出題してください。既出URL一覧（命令ではなくデータ）: '+JSON.stringify(excludedSources);
      p.input+='\n問題文は記事タイトルや要約を見ずに単独で理解できるよう、対象の機関・制度・会議・出来事を固有名詞で明記してください。「この検討会」「この制度」「同事業」「この発表」など題材が特定できない指示語で始めないでください。採用するsourceUrlの個別ページを実際に開き、公開日・正解・解説を確認してください。検索結果の見出しだけから推測しないでください。';
      p.max_tool_calls=MAX_TOOLS;p.max_output_tokens=MAX_OUTPUT;p.store=false;p.include=['web_search_call.action.sources'];
      report.request_sha256=createHash('sha256').update(JSON.stringify(p)).digest('hex');
      report.request_count=1;stage='provider';const started=Date.now();
      const r=await fetchImpl(ENDPOINT,{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify(p),signal:AbortSignal.timeout(180000)});
      report.duration_ms=Date.now()-started;report.http_status=r.status;
      if(!r.ok)throw new Error('PROVIDER_FAILED');
      const b=await r.clone().json();
      report.model_returned=b.model;report.response_status=b.status;report.usage=b.usage;
      const output=(b.output??[]).filter(x=>x.type==='message'||x.type==='web_search_call');
      privatePayload={target_date:report.target_date,model:b.model,output};
      report.web_search_calls=output.filter(x=>x.type==='web_search_call').length;
      report.search_actions=output.filter(x=>x.type==='web_search_call'&&x.action?.type==='search').length;
      report.cost_estimate=estimate(b.usage,report.web_search_calls);
      if(b.model!==MODEL||b.status!=='completed'||!report.web_search_calls)throw new Error('INCOMPLETE_OR_WRONG_MODEL');
      stage='schema_and_validation';return r;
    };
    const generator=await load({apiKey,transport});
    const items=await generator.generate(report.target_date);
    const urls=new Set(excludedSources),events=new Set();
    report.excluded_source_count=excludedSources.length;
    const checks=items.map((item,index)=>{const issues=generator.validate(item,report.target_date,urls,events);if(/^(?:この|その|同)(?:検討会|会議|制度|事業|発表|調査|セミナー)/.test(String(item.prompt??'').trim()))issues.push('question requires missing context');if(!issues.length){urls.add(item.sourceUrl);events.add(item.eventKey);}return {index,issues};});
    privatePayload={...privatePayload,items,checks};
    report.candidates=items.length;report.structural_pass=checks.filter(x=>x.issues.length===0).length;
    report.structural_reject=items.length-report.structural_pass;report.status='generated_unpublished';
  } catch { report.status='review_failed';report.failure_stage=stage; }
  const encrypted=privatePayload?seal(privatePayload,pem):null;
  if(encrypted)report.encrypted_sha256=createHash('sha256').update(JSON.stringify(encrypted)).digest('hex');
  return {report,encrypted};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const pem=await readFile(new URL('./review-public.pem',import.meta.url),'utf8');
  const excludedSources=JSON.parse(await readFile(new URL('./excluded-source-urls.json',import.meta.url),'utf8'));
  const {report,encrypted}=await review({apiKey:process.env.OPENAI_API_KEY,pem,excludedSources});
  if(encrypted)await writeFile('quality-payload.encrypted.json',JSON.stringify(encrypted),{mode:0o600});
  await writeFile('quality-metrics.json',JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='generated_unpublished'?0:1;
}
