import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, MAX_TOOL_CALLS, MAX_OUTPUT_TOKENS, makeTransport, runPilot, estimateCost, gitBlobHash } from './runner.mjs';
const url = 'https://api.openai.com/v1/responses';
const request = () => ({ method: 'POST', body: JSON.stringify({ model: MODEL, tools: [{type:'web_search'}] }) });
const response = () => new Response(JSON.stringify({status:'completed',model:MODEL,usage:{input_tokens:1000,output_tokens:100},output:[{type:'web_search_call'}]}));

test('missing key blocks before network or source loading', async () => {
  const r = await runPilot({targetDate:'2026-09-29',load:()=>{throw new Error('should not load');}});
  assert.equal(r.status,'blocked_missing_api_key'); assert.equal(r.request_count,0); assert.equal(r.production_writes,0);
});
test('one request is bounded; repeat request is rejected', async () => {
  let calls=0; const capture={};
  const transport=makeTransport({apiKey:'test-key',capture,fetchImpl:async (u,init)=>{
    calls++; assert.equal(u,url); const b=JSON.parse(init.body);
    assert.equal(b.max_tool_calls,MAX_TOOL_CALLS); assert.equal(b.max_output_tokens,MAX_OUTPUT_TOKENS); assert.equal(b.store,false);
    return response();
  }});
  await transport(url,request()); await assert.rejects(()=>transport(url,request()),/SECOND_REQUEST_BLOCKED/);
  assert.equal(calls,1); assert.equal(capture.web_search_calls,1);
});
test('unknown endpoint is blocked',async()=>{
  const t=makeTransport({apiKey:'x',fetchImpl:()=>assert.fail('network forbidden')});
  await assert.rejects(()=>t('https://example.com',request()),/UNEXPECTED_ENDPOINT/);
});
test('unknown model or extra tools are blocked',async()=>{
  const t=makeTransport({apiKey:'x',fetchImpl:()=>assert.fail('network forbidden')});
  await assert.rejects(()=>t(url,{method:'POST',body:JSON.stringify({model:'other',tools:[]})}),/UNEXPECTED_REQUEST/);
});
test('partial responses fail closed',async()=>{
  const t=makeTransport({apiKey:'x',fetchImpl:async()=>new Response('{"status":"incomplete","output":[]}')});
  await assert.rejects(()=>t(url,request()),/RESPONSE_NOT_COMPLETED/);
});
test('cost handles cached input and refuses unknown usage',()=>{
  const c=estimateCost({input_tokens:10000,input_tokens_details:{cached_tokens:2000},output_tokens:2000},4);
  assert.ok(Math.abs(c.total_usd-0.04182)<1e-10); assert.equal(c.invoice_verified,false);
  assert.equal(estimateCost(undefined,2),null); assert.equal(estimateCost({input_tokens:300000,output_tokens:10},2),null);
});
test('failure reports do not expose exception text or secrets',async()=>{
  const r=await runPilot({apiKey:'private-key',targetDate:'2026-09-29',load:async()=>{throw new Error('private-key raw provider answer');}});
  assert.equal(r.status,'pilot_failed'); assert.equal(JSON.stringify(r).includes('private-key'),false); assert.equal(r.request_count,0);
});
test('successful structural audit never publishes or emits draft answers',async()=>{
  const r=await runPilot({apiKey:'x',targetDate:'2026-09-29',load:async()=>({generate:async()=>[
    {sourceUrl:'https://mlit.go.jp/a',eventKey:'first',prompt:'private question'},
    {sourceUrl:'https://mlit.go.jp/a',eventKey:'second'},
  ], validate:(item,date,seen)=>seen.has(item.sourceUrl)?['duplicate source URL']:[]})});
  assert.equal(r.candidates,2); assert.equal(r.structural_gate_pass_count,1); assert.equal(r.published,0);
  assert.equal(r.independent_fact_audit,'not_performed'); assert.equal(JSON.stringify(r).includes('private question'),false);
});
test('Git blob hash is deterministic',()=>assert.equal(gitBlobHash('hello\n'),'ce013625030ba8dba906f756967f9e9ca394464a'));
