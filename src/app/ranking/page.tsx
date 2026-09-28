import Link from 'next/link';
import { Crown, Flame, Target, Trophy, Medal } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { configured } from '@/lib/db';
import { ranking, RankingKind } from '@/lib/data';
import './ranking.css';

export const dynamic = 'force-dynamic';
const choices: { key: RankingKind; label: string; icon: typeof Flame }[] = [
  { key:'streak', label:'Streak', icon:Flame },{ key:'weekly',label:'Weekly Hard',icon:Target },{ key:'all-time',label:'All-Time Hard',icon:Trophy },
];
export default async function Ranking({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const kind: RankingKind = type === 'weekly' || type === 'all-time' ? type : 'streak';
  const user = await currentUser();
  const data = configured() ? await ranking(kind, user?.id ?? null) : { top: [], own: null };
  return <div className="ranking-page"><span className="page-label">THE COMMUNITY / JAPAN</span><h1>続ける力を、競おう。</h1><p className="lead">毎日の積み重ねと、難問への挑戦。順位は日本時間で集計します。</p>
    <div className="ranking-tabs" role="navigation" aria-label="ランキングの種類">{choices.map(({key,label,icon:Icon})=><Link key={key} href={`/ranking?type=${key}`} className={kind===key?'active':''} aria-current={kind===key?'page':undefined}><Icon size={17}/>{label}</Link>)}</div>
    <section className="ranking-own card"><div className="own-icon"><Crown size={28}/></div><div><span className="eyebrow">YOUR POSITION</span><h2>{data.own ? `今あなたは ${data.own.rank.toLocaleString('ja-JP')} 位です` : '自分の順位を確認しよう'}</h2><p>{data.own ? `あなたのスコア：${data.own.score}` : 'ログインすると、TOP100外でも現在の順位が表示されます。'}</p></div></section>
    <div className="section-heading ranking-heading"><h2>TOP 100</h2><span className="subtle">{kind==='streak'?'連続完了日数':kind==='weekly'?'今週のHard正解':'累計Hard正解'}</span></div>
    {data.top.length ? <div className="rank-list card">{data.top.map(entry=><div key={entry.id} className={`rank-row${entry.id===user?.id?' mine':''}`}><span className={`rank-place${entry.rank<=3?' podium':''}`}>{entry.rank<=3?<Medal size={17}/>:null}{entry.rank}</span><span className="rank-name">{entry.username}{entry.badge ? <span className="rank-badge">{entry.badge}</span>:null}</span><strong>{entry.score.toLocaleString('ja-JP')}</strong></div>)}</div>
      : <div className="empty-state"><strong>ランキングはまだ始まっていません</strong><span>公開後、初回の競技回答だけが反映されます。</span></div>}
    <p className="rank-note">同点は同順位。Weekly Hardは月曜 00:00（日本時間）に切り替わります。過去問学習は加点されません。</p>
  </div>;
}
