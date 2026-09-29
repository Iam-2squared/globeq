import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks=vi.hoisted(()=>({db:vi.fn()}));
vi.mock('../src/lib/db',()=>({db:mocks.db}));
import { runDailyContent, searchAndDraft, validateItem } from '../src/lib/daily-content';
import { DAILY_POLICY, dailyUsage } from '../src/lib/daily-generation-policy';
import { GET } from '../src/app/api/health/daily-content/route';

const item=()=>({title:'合成テスト用の公式発表タイトル',summary:'これは実際の記事ではない、合成テスト専用の要約です。',sourceName:'環境省',sourceUrl:'https://www.env.go.jp/press/synthetic-test.html',publishedAt:'2026-09-28',category:'テスト',tags:[],eventKey:'synthetic-event-20260928',prompt:'合成テストで発表された試験対象はどれですか？',explanation:'合成テストで定義した正解は対象Aです。実際の記事ではありません。',difficulty:'normal' as const,options:[{label:'対象A',correct:true},{label:'対象B',correct:false},{label:'対象C',correct:false},{label:'対象D',correct:false}]});
const body=(items=[item()])=>({model:'gpt-6-luna',status:'completed',usage:{input_tokens:1000,output_tokens:100,input_tokens_details:{cache_write_tokens:500,cached_tokens:0}},output:[{type:'web_search_call',action:{type:'search'}},{type:'message',content:[{type:'output_text',text:JSON.stringify({items})}]}]});
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.stubEnv('OPENAI_API_KEY','TEST_ONLY_NOT_A_REAL_KEY');
  vi.stubEnv('OPENAI_DAILY_MODEL','gpt-5.6-sol');
  vi.stubEnv('GLOBEQ_DAILY_GENERATION_PAUSED','');
  vi.stubEnv('VERCEL_GIT_COMMIT_SHA','synthetic-deployment-commit');
  mocks.db.mockReset();
  fetchMock=vi.fn(async()=>Response.json(body()));vi.stubGlobal('fetch',fetchMock);
  vi.spyOn(console,'info').mockImplementation(()=>{});
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('reviewed Luna-only production policy',()=>{
 it('pins Luna despite a stale Sol environment; keeps strict schema and paid-tool limits',async()=>{
   const result=await searchAndDraft('2026-09-29',['https://www.env.go.jp/old.html']);
   expect(result).toHaveLength(1);expect(fetchMock).toHaveBeenCalledTimes(1);
   const [url,init]=fetchMock.mock.calls[0] as any;
   expect(url).toBe('https://api.openai.com/v1/responses');
   const p=JSON.parse(init.body);
   expect(p).toMatchObject({model:'gpt-6-luna',reasoning:{effort:'low'},max_tool_calls:8,max_output_tokens:16000,store:false,tool_choice:'required'});
   expect(p.tools).toHaveLength(1);expect(p.tools[0].filters.allowed_domains).toHaveLength(7);
   expect(p.text.format.strict).toBe(true);expect(p.text.format.schema.properties.items.minItems).toBe(1);
   expect(p.text.format.schema.properties.items.maxItems).toBe(100);
   expect(p.input).toContain('https://www.env.go.jp/old.html');expect(p.input).toContain('単独で理解');
   expect(init.signal).toBeInstanceOf(AbortSignal);expect(mocks.db).not.toHaveBeenCalled();
 });
 it('network failure makes no retry or expensive fallback',async()=>{
   fetchMock.mockRejectedValueOnce(new Error('mock network failed'));
   await expect(searchAndDraft('2026-09-29')).rejects.toThrow('mock network failed');
   expect(fetchMock).toHaveBeenCalledTimes(1);
 });
 it('provider failure hides response text and never retries',async()=>{
   fetchMock.mockResolvedValueOnce(new Response('SECRET_OR_PROVIDER_BODY',{status:400}));
   await expect(searchAndDraft('2026-09-29')).rejects.toThrow('HTTP 400');
   expect(fetchMock).toHaveBeenCalledTimes(1);expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('SECRET_OR_PROVIDER_BODY');
 });
 it.each([
   ['wrong model',{...body(),model:'gpt-5.6-sol'}],
   ['incomplete response',{...body(),status:'incomplete'}],
   ['no web search',{...body(),output:body().output.filter(x=>x.type!=='web_search_call')}],
 ])('rejects %s',async(_name,value)=>{
   fetchMock.mockResolvedValueOnce(Response.json(value));
   await expect(searchAndDraft('2026-09-29')).rejects.toThrow('completed Luna');expect(fetchMock).toHaveBeenCalledTimes(1);
 });
 it('missing key never makes a request',async()=>{
   vi.stubEnv('OPENAI_API_KEY','');await expect(searchAndDraft('2026-09-29')).rejects.toThrow('OPENAI_API_KEY');expect(fetchMock).not.toHaveBeenCalled();
 });
 it('pause blocks generation before model or database access',async()=>{
   vi.stubEnv('GLOBEQ_DAILY_GENERATION_PAUSED','1');
   expect(await runDailyContent('2026-09-29')).toMatchObject({status:'paused',published:0});
   await expect(searchAndDraft('2026-09-29')).rejects.toThrow('paused');
   expect(fetchMock).not.toHaveBeenCalled();expect(mocks.db).not.toHaveBeenCalled();
 });
 it('health exposes only safe policy and deployment metadata, not a generation endpoint',async()=>{
   const r=await GET();const p=await r.json();
   expect(p).toMatchObject({model:'gpt-6-luna',automaticFallback:false,automaticRetry:false,maxToolCalls:8,paused:false,deploymentCommit:'synthetic-deployment-commit'});
   expect(JSON.stringify(p)).not.toContain('TEST_ONLY_NOT_A_REAL_KEY');expect(JSON.stringify(p)).not.toContain('gpt-5.6-sol');
   expect(r.headers.get('cache-control')).toBe('no-store');expect(fetchMock).not.toHaveBeenCalled();expect(mocks.db).not.toHaveBeenCalled();
 });
 it('sanitized usage never copies provider text or secrets',()=>{
   const usage=dailyUsage({...body(),privateKey:'DO_NOT_LOG',input:'DO_NOT_LOG'});
   expect(usage).toMatchObject({inputTokens:1000,cacheWriteTokens:500,webToolCalls:1,searchActions:1});
   expect(JSON.stringify(usage)).not.toContain('DO_NOT_LOG');expect(dailyUsage({usage:{input_tokens:-1}}).inputTokens).toBeNull();
 });
});

describe('retained daily integrity',()=>{
 it('accepts a self-contained valid synthetic item, but rejects missing context',()=>{
   expect(validateItem(item(),'2026-09-29',new Set(),new Set())).toEqual([]);
   expect(validateItem({...item(),prompt:'この検討会の第3回はいつ開催予定ですか？'},'2026-09-29',new Set(),new Set())).toContain('question requires missing context');
 });
 it('retains URL/event, source, option and freshness gates',()=>{
   expect(validateItem(item(),'2026-09-29',new Set([item().sourceUrl]),new Set([item().eventKey]))).toEqual(expect.arrayContaining(['duplicate source URL','duplicate event key']));
   expect(validateItem({...item(),sourceUrl:'https://bad.invalid/item'},'2026-09-29',new Set(),new Set())).toContain('source domain is not approved');
   expect(validateItem({...item(),sourceName:'農林水産省'},'2026-09-29',new Set(),new Set())).toContain('source name/domain mismatch');
   expect(validateItem({...item(),options:item().options.map(o=>({...o,correct:true}))},'2026-09-29',new Set(),new Set())).toContain('exactly one correct option required');
   expect(validateItem({...item(),options:item().options.map(o=>({...o,label:'同じ'}))},'2026-09-29',new Set(),new Set())).toContain('four distinct options required');
   expect(validateItem({...item(),publishedAt:'2020-01-01'},'2026-09-29',new Set(),new Set())).toContain('outside 7-day freshness window');
 });
 it('already published day makes no model call or content write',async()=>{
   const sql=vi.fn(async()=>[{id:'day',status:'published'}]);mocks.db.mockReturnValue(sql);
   expect(await runDailyContent('2026-09-29')).toMatchObject({status:'already-published',published:0});expect(sql).toHaveBeenCalledTimes(1);expect(fetchMock).not.toHaveBeenCalled();
 });
 it('reads historical URLs before generation and passes them to the model',async()=>{
   let historyRead=false;
   const sql=vi.fn(async(strings:any)=>{const text=strings.join('?');if(text.includes('select id,status from globeq.quiz_days'))return [];if(text.includes('insert into globeq.automation_runs'))return [{id:'run'}];if(text.includes('select id from globeq.users'))return [{id:'editor'}];if(text.includes('select source_url,event_key')){historyRead=true;return [{source_url:'https://www.env.go.jp/old.html',event_key:'old-event'}];}return [];});mocks.db.mockReturnValue(sql);
   fetchMock.mockImplementationOnce(async(_url:any,init:any)=>{expect(historyRead).toBe(true);expect(JSON.parse(init.body).input).toContain('https://www.env.go.jp/old.html');throw new Error('MOCK_STOP_BEFORE_CONTENT');});
   await expect(runDailyContent('2026-09-29')).rejects.toThrow('MOCK_STOP_BEFORE_CONTENT');expect(fetchMock).toHaveBeenCalledTimes(1);
   expect(sql.mock.calls.some(([parts])=>parts.join('').includes('insert into globeq.questions'))).toBe(false);
 });
 it('keeps transactional publish count 1-100 and refuses mixed unpublished content',()=>{
   const source=readFileSync('src/lib/daily-content.ts','utf8');
   expect(source).toContain('sql.begin');expect(source).toContain('gate.total)<1');expect(source).toContain('gate.total)>100');
   expect(source).toContain('refusing mixed automatic publish');expect(source).toContain('accepted.length===100');
   expect(DAILY_POLICY.automaticFallback).toBe(false);expect(DAILY_POLICY.automaticRetry).toBe(false);
 });
});
