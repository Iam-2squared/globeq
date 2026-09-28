import { describe, expect, it } from 'vitest';
import { publicQuestion } from '../src/lib/public-question';
import { japanDate, mondayOf, calendarDays, validQuizDate } from '../src/lib/time';
import { rankingQueries } from '../src/lib/ranking-queries';
import { validatePublishRows } from '../scripts/content-rules.mjs';

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
  });
});

describe('editorial gate', () => {
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
