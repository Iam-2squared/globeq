import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, CalendarDays, CheckCircle2 } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { configured } from '@/lib/db';
import { homeData } from '@/lib/data';
import { calendarDays, japanDate } from '@/lib/time';
import './home.css';

export const dynamic = 'force-dynamic';
function monthShift(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const today = japanDate();
  const params = await searchParams;
  const currentMonth = today.slice(0, 7);
  const month = typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month) && params.month <= currentMonth && params.month >= monthShift(currentMonth, -24)
    ? params.month : currentMonth;
  const user = await currentUser();
  const data = configured() ? await homeData(user?.id ?? null, today, month) : { days: [], activity: [], streak: 0, todayTotal: 0, todayAnswered: 0 };
  const published = new Map(data.days.map((d) => [d.date, d]));
  const activity = new Map(data.activity.map((a) => [a.date, a]));
  const days = calendarDays(month);
  const offset = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const prev = monthShift(month, -1);
  const next = monthShift(month, 1);
  const total = data.todayTotal;
  const answered = data.todayAnswered;
  return <div className="home-page">
    <div className="welcome-line"><span className="page-label">YOUR DAILY PERSPECTIVE</span><span className="today-date">{today.replaceAll('-', '.')} · JST</span></div>
    <h1>ニュースを、<br className="mobile-break" />確かな理解に。</h1>
    <p className="lead">今日の出来事を4択で振り返ろう。答えたあとに要点と元記事を確認できます。</p>

    <section className="home-hero" aria-label="今日の進捗">
      <div><span className="eyebrow">TODAY’S QUIZ / JAPAN</span><h2>今日のニュースに、<br />答えを見つけよう。</h2><p>{total ? `今日の進捗 ${answered} / ${total}` : '本日の問題は公開準備中です'}</p>
        <div className="hero-meter"><div className="meter"><span style={{ width: `${total ? Math.min(100, Math.round(answered / total * 100)) : 0}%` }} /></div><span>{total ? `${Math.round(answered / total * 100)}%` : '—'}</span></div>
        {total ? <Link className="button button-primary" href="/quiz">{answered ? '続きを解く' : '今日の問題を解く'} <ArrowRight size={17} /></Link>
          : <span className="hero-soon">公開前の問題は表示されません</span>}
      </div>
      <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring"><span>Q<span className="orbit-dot">.</span></span></div><div className="orbit-small">NEWS<br />TO KNOW</div></div>
    </section>

    <div className="home-grid">
      <section className="card streak-card"><span className="eyebrow">KEEP THE MOMENTUM</span><div className="streak-number"><Flame size={37} /> <strong>{data.streak}</strong><span>DAY STREAK</span></div><p>毎日の20問完了で、連続記録を伸ばそう。</p></section>
      <section className="card progress-card"><span className="eyebrow">TODAY’S PROGRESS</span><div className="progress-number"><strong>{total ? answered : '—'}</strong><span>/ {total || 20}</span></div><p>{total ? answered >= 20 ? answered >= total ? '今日の問題をすべて解きました！' : `20問達成。残り${total - answered}問にも挑戦できます` : `あと${20 - answered}問で今日の20問を達成` : '公開された日に回答数を記録します'}</p></section>
    </div>

    <section className="calendar-section card">
      <div className="section-heading"><div><span className="eyebrow">YOUR LEARNING HISTORY</span><h2><CalendarDays size={21} /> カレンダー</h2></div><div className="calendar-month"><Link href={`/?month=${prev}`} aria-label="前の月"><ChevronLeft size={19}/></Link><strong>{month.slice(0,4)}年 {Number(month.slice(5))}月</strong>{next <= currentMonth ? <Link href={`/?month=${next}`} aria-label="次の月"><ChevronRight size={19}/></Link> : <span className="chevron-placeholder" />}</div></div>
      <div className="calendar-grid">{['月','火','水','木','金','土','日'].map(d => <span className="weekday" key={d}>{d}</span>)}
        {Array.from({length:offset},(_,i)=><span key={`empty-${i}`} />)}
        {days.map(({date,day})=>{
          const quiz = published.get(date);
          const record = activity.get(date);
          const className = `calendar-day${date===today?' today':''}${record?.completed?' completed':record?.answered?' answered':''}`;
          return quiz ? <Link key={date} className={className} href={`/quiz?date=${date}`} aria-label={`${date}のクイズ、${record?.completed?'完了':record?.answered ? `${record.answered}問回答`:'未回答'}`}><span>{day}</span>{record?.completed ? <CheckCircle2 size={13}/> : record?.answered ? <i/> : null}</Link>
            : <span key={date} className="calendar-day inactive"><span>{day}</span></span>;
        })}</div>
      <div className="calendar-legend"><span><i className="legend-dot answered-dot"/> 回答した日</span><span><i className="legend-dot completed-dot"/> 完了した日</span><span className="subtle">日付は日本時間です</span></div>
    </section>
  </div>;
}
