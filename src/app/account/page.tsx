import { UserRound, Flame, Target, Award, ChartNoAxesColumn } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { configured } from '@/lib/db';
import { accountData } from '@/lib/data';
import { AuthPanel, LogoutButton } from '@/components/auth-panel';
import { BadgePicker } from '@/components/badge-picker';
import './account.css';

export const dynamic = 'force-dynamic';
export default async function Account() {
  const user = await currentUser();
  const info = user ? await accountData(user.id) : null;
  return <div className="account-page"><span className="page-label">YOUR CORNER</span><h1>アカウント</h1><p className="lead">積み重ねた学びが、ここに残ります。</p>
    {!configured() ? <div className="empty-state"><strong>アカウントの準備中です</strong><span>データベース接続後に登録とログインが使えます。</span></div>
      : !user || !info ? <AuthPanel /> : <>
        <div className="card profile-card"><div className="avatar"><UserRound size={31}/></div><div><span className="eyebrow">GLOBEQ MEMBER</span><h2>{user.username}</h2><p>{info.selectedBadge ? `✦ ${info.selectedBadge}` : 'バッジを獲得してプロフィールに表示しよう'}</p></div><LogoutButton /></div>
        <div className="account-stats"><div className="card"><Flame size={19}/><span>現在のStreak</span><strong>{Number(info.currentStreak)}</strong></div><div className="card"><ChartNoAxesColumn size={19}/><span>最長Streak</span><strong>{Number(info.longestStreak)}</strong></div><div className="card"><Target size={19}/><span>今週の初見正解</span><strong>{Number(info.weeklyHard)}</strong></div><div className="card"><Award size={19}/><span>累計初見正解</span><strong>{Number(info.allTimeHard)}</strong></div></div>
        <section className="card stat-detail"><h2>回答の記録</h2><div><span>総回答数</span><strong>{Number(info.totalAnswers)} 問</strong></div><div><span>正答数</span><strong>{Number(info.correctAnswers)} 問</strong></div><div><span>正答率</span><strong>{Number(info.totalAnswers) ? Math.round(Number(info.correctAnswers)/Number(info.totalAnswers)*100) : 0}%</strong></div></section>
        <section className="card badge-section"><div className="section-heading"><div><span className="eyebrow">YOUR ACHIEVEMENTS</span><h2>バッジ</h2></div><span className="subtle">獲得済みから選択</span></div><BadgePicker badges={info.badges as {id:string;title:string;description:string}[]} selected={info.selectedBadgeId as string|null}/></section>
      </>}
  </div>;
}
