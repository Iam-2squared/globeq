import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { configured } from '@/lib/db';
import { publishedQuestions, answersForDay } from '@/lib/data';
import { japanDate, validQuizDate } from '@/lib/time';
import { QuizPlayer } from '@/components/quiz-player';
import './quiz.css';

export const dynamic = 'force-dynamic';
export default async function Quiz({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  const { date: inputDate } = await searchParams;
  const today = japanDate();
  const date = validQuizDate(typeof inputDate === 'string' ? inputDate : today) ?? today;
  const canUseDb = configured();
  const questionsPromise = canUseDb ? publishedQuestions(date) : Promise.resolve([]);
  const user = await currentUser();
  const answersPromise = user && canUseDb ? answersForDay(user.id, date) : Promise.resolve([]);
  const [questions, answers] = await Promise.all([questionsPromise, answersPromise]);
  return <div className="quiz-page"><span className="page-label">TODAY'S PERSPECTIVE / JAPAN</span><h1>今日を、理解する。</h1><p className="lead">4択で確かめてから、要点と出典に進もう。</p>
    <div className="quiz-toolbar"><div><strong>{date.replaceAll('-', '.')}</strong><span>{date===today?'今日のクイズ':'過去問学習 · ランキング対象外'}</span></div><form action="/quiz"><label htmlFor="quiz-date">日付を選ぶ</label><input id="quiz-date" name="date" type="date" defaultValue={date} max={today}/><button type="submit">移動</button></form></div>
    {questions.length ? <QuizPlayer key={date} date={date} questions={questions} initialAnswers={answers} signedIn={!!user} isToday={date===today}/>
      : <div className="empty-state"><strong>{date===today?'今日の20問は公開準備中です':'この日の問題はまだありません'}</strong><span>出典と正解を確認し、20問以上そろった日だけ公開します。</span><p><Link className="section-link" href="/">ホームへ戻る →</Link></p></div>}
  </div>;
}
