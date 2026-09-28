import { z } from 'zod';
import { normalizeCandidate } from './article-normalization.mjs';

export const sourceSchema = z.object({
  title:z.string().min(8).max(300),sourceName:z.string().min(2).max(120),
  sourceUrl:z.url().refine(v=>v.startsWith('https://')),publishedAt:z.iso.datetime({offset:true}),
  category:z.string().min(2).max(80),tags:z.array(z.string().min(1).max(80)).max(12).default([]),
  eventKey:z.string().min(4).max(160),facts:z.array(z.string().min(8).max(500)).min(1).max(20),
});
const generatedSchema=z.object({
  summary:z.string().min(12).max(800),prompt:z.string().min(10).max(500),explanation:z.string().min(12).max(800),
  difficulty:z.enum(['easy','normal','hard']),
  options:z.array(z.object({label:z.string().min(1).max(240),correct:z.boolean()})).length(4),
});
export function validateGeneratedDraft(source,generated){
  const s=sourceSchema.parse(source),g=generatedSchema.parse(generated);
  if(g.options.filter(o=>o.correct).length!==1)throw new Error('Generated draft must have exactly one correct option');
  if(new Set(g.options.map(o=>o.label.normalize('NFKC').trim().toLowerCase())).size!==4)throw new Error('Generated draft must have four distinct option labels');
  return normalizeCandidate({article:{title:s.title,summary:g.summary,sourceName:s.sourceName,sourceUrl:s.sourceUrl,
    publishedAt:s.publishedAt,category:s.category,tags:s.tags,eventKey:s.eventKey},
    question:{prompt:g.prompt,explanation:g.explanation,difficulty:g.difficulty,options:g.options}});
}
const outputSchema={type:'object',additionalProperties:false,required:['summary','prompt','explanation','difficulty','options'],properties:{
  summary:{type:'string',minLength:12,maxLength:800},prompt:{type:'string',minLength:10,maxLength:500},
  explanation:{type:'string',minLength:12,maxLength:800},difficulty:{type:'string',enum:['easy','normal','hard']},
  options:{type:'array',minItems:4,maxItems:4,items:{type:'object',additionalProperties:false,required:['label','correct'],
    properties:{label:{type:'string',minLength:1,maxLength:240},correct:{type:'boolean'}}}}}};
export async function generateDraft(source,{apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_DRAFT_MODEL||'gpt-5-mini',fetchImpl=fetch}={}){
  const s=sourceSchema.parse(source);if(!apiKey)throw new Error('OPENAI_API_KEY is required');
  const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',
    headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
    body:JSON.stringify({model,input:[
      {role:'system',content:[{type:'input_text',text:'Create a PRIVATE GlobeQ Japan quiz draft. Use ONLY supplied facts; never add facts from memory or inference. Write natural Japanese. Make one neutral factual four-choice question with exactly one correct answer. Political/election/policy content must ask only verifiable descriptive facts and never evaluate actors, motives, support or opposition. Summary and explanation must be original concise wording, not article-body reproduction. If facts are insufficient, do not invent missing information.'}]},
      {role:'user',content:[{type:'input_text',text:JSON.stringify(s)}]}],
      text:{format:{type:'json_schema',name:'globeq_draft',strict:true,schema:outputSchema}}})});
  if(!response.ok)throw new Error(`OpenAI Responses API failed: ${response.status}`);
  const body=await response.json();
  const text=body.output?.flatMap(item=>item.content??[]).find(item=>item.type==='output_text')?.text;
  if(!text)throw new Error('OpenAI returned no structured draft');
  return validateGeneratedDraft(s,JSON.parse(text));
}
