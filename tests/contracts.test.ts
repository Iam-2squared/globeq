import { describe, expect, it } from 'vitest';
import { publicQuestion } from '../src/lib/public-question';
import { japanDate, mondayOf, calendarDays, validQuizDate } from '../src/lib/time';
import { rankingQueries } from '../src/lib/ranking-queries';
import { validatePublishRows } from '../scripts/content-rules.mjs';
import { canonicalArticleUrl,normalizeCandidate } from '../scripts/article-normalization.mjs';
import { validateGeneratedDraft } from '../scripts/openai-draft.mjs';

describe('public contract', () => {
  it('allows only question fields and never serializes the answer or explanation', () => {
    const question = publicQuestion({
      id:'q1',prompt:'What happened?',difficulty:'hard',position:1,
      isCorrect:true,explanation:'private',sourceUrl:'https://source.test',
      options:[{id:'o1',label:'A',position:1,is_correct:true},{id:'o2',label:'B',position:2,is_correct:false}],
    });
    expect(JSON.stringify(question)).not.toMatch(/isCorrect|is_correct|explanation|sourceUrl/);
    expect(question.options[0]).toEqual({ id:'o1',label:'A',position:1 });
  });
  it('uses Tokyo midnight and Monday week boundaries', () => {
    expect(japanDate(new Date('2026-09-27T14:59:59Z'))).toBe('2026-09-27');
    expect(japanDate(new Date('2026-09-27T15:00:00Z'))).toBe('2026-09-28');
    expect(mondayOf('2026-09-27')).toBe('2026-09-21');
    expect(mondayOf('2026-09-28')).toBe('2026-09-28');
    expect(calendarDays('2026-02')).toHaveLength(28);
    expect(validQuizDate('2026-02-30')).toBeNull();
  });
  it('binds user data and only selects ranking syntax from fixed variants', () => {
    const all = rankingQueries('all-time','00000000-0000-0000-0000-000000000001','2026-09-28','2026-09-28');
    expect(all.own?.text).not.toContain('00000000-0000-0000-0000-000000000001');
    expect(all.own?.params).toHaveLength(1);
    expect(rankingQueries('weekly',null,'2026-09-28','2026-09-28').top.params).toEqual(['2026-09-28']);
    expect(rankingQueries('weekly',null,'2026-09-28','2026-09-28').top.text).toContain('first_correct');
    expect(rankingQueries('all-time',null,'2026-09-28','2026-09-28').top.text).toContain('correct_answers');
    expect(rankingQueries('streak',null,'2026-09-28','2026-09-28').zero?.(20).params).toEqual(['2026-09-28',20]);
  });
});

describe('editorial gate', () => {
  it('canonicalizes links and normalizes metadata before duplicate checks', () => {
    expect(canonicalArticleUrl('https://EXAMPLE.test/a?utm_source=mail&id=3#top')).toBe('https://example.test/a?id=3');
    expect(() => canonicalArticleUrl('http://example.test/news')).toThrow();
    const item=normalizeCandidate({article:{title:'  Japan  update ',summary:'  short  text  ',sourceName:' Source ',
      sourceUrl:'https://EXAMPLE.test/a?fbclid=123',publishedAt:'2026-09-28T13:00:00+09:00',
      category:'  社会 ',tags:[' 日本 ','日本'],eventKey:' Same Event '},
      question:{prompt:'  What happened? ',explanation:' A clear explanation ',options:[{label:' A  ',correct:true}]}});
    expect(item.article).toMatchObject({sourceUrl:'https://example.test/a',title:'Japan update',eventKey:'same-event',tags:['日本']});
  });
  const good = (i:number) => ({
    id:`q${i}`,status:'reviewed',event_key:`event-${i}`,option_count:4,correct_count:1,distinct_labels:4,
    reviewer_id:'editor',rights_checked:true,neutrality_checked:true,
    verification_note:'Source checked directly by the editor.',
    source_url:`https://source.example/${i}`,published_at:new Date('2026-09-28T04:00:00Z'),
  });
  it('requires 20 independently reviewed questions', () => {
    expect(validatePublishRows(Array.from({length:19},(_,i)=>good(i)),'2026-09-28')).toContain('At least 20 active questions are required; found 19');
    expect(validatePublishRows(Array.from({length:20},(_,i)=>good(i)),'2026-09-28')).toEqual([]);
  });
  it('blocks ambiguity, duplicate events and unchecked rights', () => {
    const rows = Array.from({length:20},(_,i)=>good(i));
    rows[1]={...rows[1],correct_count:2,rights_checked:false,event_key:rows[0].event_key};
    const issues = validatePublishRows(rows,'2026-09-28');
    expect(issues.join(' ')).toMatch(/exactly one correct|source, rights|duplicate event/);
  });
});


describe('AI draft boundary',()=>{
  it('accepts a structured private draft but rejects ambiguous answer keys',()=>{
    const source={title:'Official verified update',sourceName:'Official source',sourceUrl:'https://source.example/item',publishedAt:'2026-09-28T10:00:00+09:00',category:'社会',tags:['制度'],eventKey:'official-event',facts:['The verified source directly states the factual answer used by the editor.']};
    const generated={summary:'GlobeQ独自の短い要約として確認用に作成した文章です。',prompt:'確認済み資料で示された事実として正しいものはどれですか？',explanation:'確認済みの一次資料に基づく事実を簡潔に説明した文章です。',difficulty:'normal',options:[{label:'選択肢A',correct:true},{label:'選択肢B',correct:false},{label:'選択肢C',correct:false},{label:'選択肢D',correct:false}]};
    expect(validateGeneratedDraft(source,generated).question.options).toHaveLength(4);
    expect(()=>validateGeneratedDraft(source,{...generated,options:generated.options.map(o=>({...o,correct:true}))})).toThrow(/exactly one correct/);
  });
});


describe('deployment environment fallback',()=>{
  it('keeps runtime DB configuration independent from Vercel alias expansion',()=>{
    const source=require('node:fs').readFileSync('src/lib/db.ts','utf8');
    expect(source).toMatch(/POSTGRES_URL/);
    expect(source).toMatch(/startsWith\('\$'\)/);
  });
});


describe('Japan news freshness window',()=>{
  it('accepts the previous Friday for a Monday quiz but rejects Thursday',()=>{
    const row=(published_at)=>({id:'q',status:'reviewed',event_key:'event',option_count:4,correct_count:1,distinct_labels:4,reviewer_id:'editor',rights_checked:true,neutrality_checked:true,verification_note:'Source checked directly by editor.',source_url:'https://source.example/item',published_at:new Date(published_at)});
    expect(validatePublishRows(Array.from({length:20},(_,i)=>({...row('2026-09-25T00:00:00+09:00'),id:'q'+i,event_key:'e'+i,source_url:'https://source.example/'+i})),'2026-09-28')).toEqual([]);
    expect(validatePublishRows(Array.from({length:20},(_,i)=>({...row('2026-09-24T23:59:59+09:00'),id:'q'+i,event_key:'e'+i,source_url:'https://source.example/'+i})),'2026-09-28').some(x=>x.includes('outside reviewed news window'))).toBe(true);
  });
});
