import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {review} from './quality-review.mjs';
const pem=readFileSync(new URL('./review-public.pem',import.meta.url),'utf8');
test('existing URLs enter the prompt and existing-URL validation',async()=>{
 const url='https://www.env.go.jp/example';let sent='';
 const r=await review({apiKey:'TEST_ONLY',pem,excludedSources:[url],fetchImpl:async(u,i)=>{sent=JSON.parse(i.body).input;return Response.json({model:'gpt-6-luna',status:'completed',usage:{input_tokens:100,output_tokens:10},output:[{type:'web_search_call',action:{type:'search'}}]});},load:async({transport})=>({generate:async()=>{await transport('https://api.openai.com/v1/responses',{method:'POST',body:JSON.stringify({model:'gpt-6-luna',tools:[{type:'web_search'}],input:'test prompt'})});return [{sourceUrl:url,eventKey:'old'}];},validate:(item,date,urls)=>urls.has(item.sourceUrl)?['duplicate source URL']:[]})});
 assert.ok(sent.includes(url));assert.equal(r.report.structural_pass,0);assert.equal(r.report.excluded_source_count,1);assert.equal(r.report.request_count,1);
});
