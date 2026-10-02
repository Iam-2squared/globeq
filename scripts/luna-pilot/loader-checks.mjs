/** Offline integration checks: real source/dependencies, injected mock HTTP only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGenerator, runPilot, MODEL } from './runner.mjs';

const targetDate = new Intl.DateTimeFormat('en-CA', {
  timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date());
function fixture() {
  return {
    title:'非公開テスト専用の架空発表',
    summary:'これはテストだけに使う架空のデータで、実在する報道ではありません。',
    sourceName:'国土交通省', sourceUrl:'https://www.mlit.go.jp/offline-test-only',
    publishedAt:new Date(Date.now()-86400000).toISOString(),
    category:'検証', tags:['架空テスト'], eventKey:'offline-only-fixture-20260929',
    prompt:'この非公開テストで正解として設定した選択肢はどれですか？',
    explanation:'これは架空のテストデータです。選択肢Aだけが正解です。',
    difficulty:'normal',
    options:[{label:'選択肢A',correct:true},{label:'選択肢B',correct:false},
      {label:'選択肢C',correct:false},{label:'選択肢D',correct:false}],
  };
}

test('actual pinned source loads without calling transport or exposing publisher', async () => {
  let calls=0;
  const generator=await loadGenerator({apiKey:'fixture-key-not-live',transport:()=>{calls++;throw new Error('NETWORK_BLOCKED');}});
  assert.equal(typeof generator.generate,'function');
  assert.equal(typeof generator.validate,'function');
  assert.deepEqual(Object.keys(generator).sort(),['generate','validate']);
  assert.equal(generator.runDailyContent,undefined);
  assert.equal(calls,0);
});

test('actual generation and validation work with one mock response and no draft disclosure', async () => {
  let calls=0;
  const item=fixture();
  const report=await runPilot({apiKey:'fixture-key-not-live',targetDate,fetchImpl:async(url,init)=>{
    calls++;
    assert.equal(url,'https://api.openai.com/v1/responses');
    assert.equal(init.method,'POST');
    const payload=JSON.parse(init.body);
    assert.equal(payload.model,MODEL);
    assert.equal(payload.max_tool_calls,4);
    assert.equal(payload.max_output_tokens,16000);
    assert.equal(payload.store,false);
    assert.equal(payload.text.format.schema.properties.items.minItems,1);
    assert.equal(payload.text.format.schema.properties.items.maxItems,100);
    return new Response(JSON.stringify({model:MODEL,status:'completed',
      usage:{input_tokens:1000,output_tokens:200,input_tokens_details:{cached_tokens:0}},
      output:[{type:'web_search_call',status:'completed'},
        {type:'message',content:[{type:'output_text',text:JSON.stringify({items:[item]})}]}],
    }),{status:200,headers:{'content-type':'application/json'}});
  }});
  assert.equal(calls,1);
  assert.equal(report.status,'generated_unpublished');
  assert.equal(report.structural_gate_pass_count,1);
  assert.equal(report.structural_gate_reject_count,0);
  assert.equal(report.production_writes,0);
  assert.equal(report.published,0);
  assert.equal(report.independent_fact_audit,'not_performed');
  assert.equal(JSON.stringify(report).includes(item.prompt),false);
  assert.equal(JSON.stringify(report).includes('fixture-key-not-live'),false);
});

test('actual validator still rejects wrong domains and nonunique options', async () => {
  const generator=await loadGenerator({apiKey:'fixture-key-not-live',transport:()=>{throw new Error('NETWORK_BLOCKED');}});
  const item=fixture();
  item.sourceUrl='https://example.com/offline-test-only';
  item.options[1].label=item.options[0].label;
  item.options[1].correct=true;
  const issues=generator.validate(item,targetDate,new Set(),new Set());
  assert.equal(issues.includes('source domain is not approved'),true);
  assert.equal(issues.includes('four distinct options required'),true);
  assert.equal(issues.includes('exactly one correct option required'),true);
});

test('changed source is rejected before dependency or transport access', async () => {
  const root=await mkdtemp(join(tmpdir(),'globeq-pilot-hash-'));
  let calls=0;
  try {
    await mkdir(join(root,'src/lib'),{recursive:true});
    await writeFile(join(root,'src/lib/daily-content.ts'),'// intentionally different offline fixture\n');
    await assert.rejects(loadGenerator({apiKey:'fixture-key-not-live',root,transport:()=>{calls++;}}),/SOURCE_CHANGED_REVIEW_REQUIRED/);
    assert.equal(calls,0);
  } finally { await rm(root,{recursive:true,force:true}); }
});
