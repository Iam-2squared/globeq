'use client';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, X, Flag } from 'lucide-react';
import type { PublicQuestion, AnswerResult } from '@/lib/data';

export function QuizPlayer({ date, questions, initialAnswers, signedIn, isToday }: {
  date: string; questions: PublicQuestion[]; initialAnswers: AnswerResult[]; signedIn: boolean; isToday: boolean;
}) {
  const [answers,setAnswers] = useState<Record<string,AnswerResult>>(() => Object.fromEntries(initialAnswers.map(a=>[a.questionId,a])));
  const [index,setIndex] = useState(() => Math.max(0,questions.findIndex(q=>!initialAnswers.some(a=>a.questionId===q.id))));
  const [selected,setSelected] = useState('');
  const [pending,setPending] = useState(false);
  const [error,setError] = useState('');
  const [report,setReport] = useState(false);
  const [reportDone,setReportDone] = useState(false);
  const question = questions[index];
  const result = answers[question.id];
  const answered = Object.keys(answers).length;
  async function submit() {
    if (!selected || pending) return;
    setPending(true);setError('');
    try {
      const response = await fetch('/api/answers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({questionId:question.id,optionId:selected})});
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? '回答を保存できませんでした。'); return; }
      setAnswers(previous=>({...previous,[question.id]:data}));
    } catch { setError('通信に失敗しました。再度お試しください。'); }
    finally { setPending(false); }
  }
  async function reportProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '');
    const response = await fetch('/api/reports',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({questionId:question.id,reason})});
    if(response.ok){setReportDone(true);setReport(false);}else{setError((await response.json()).error??'報告できませんでした。');}
  }
  return <div className="quiz-layout"><aside className="quiz-side card"><span className="eyebrow">DAILY QUIZ</span><div className="quiz-counter"><strong>{answered}</strong><span>/ {questions.length} 問</span></div><div className="meter"><span style={{width:`${Math.round(answered/questions.length*100)}%`}}/></div><p>{isToday?'今日の問題を一つずつ進めよう。':'過去問は学習用です。順位・Streakには反映されません。'}</p><div className="quiz-index" aria-label="問題を選択">{questions.map((q,i)=><button type="button" key={q.id} aria-label={`${i+1}問目${answers[q.id]?'回答済み':''}`} aria-current={index===i?'step':undefined} className={`${i===index?'current ':''}${answers[q.id]?'done':''}`} onClick={()=>{setIndex(i);setSelected('');setError('');setReport(false);setReportDone(false);}}>{i+1}</button>)}</div></aside>
    <section className="card question-card" aria-live="polite"><div className="question-top"><span className="eyebrow">QUESTION {String(index+1).padStart(2,'0')} / {String(questions.length).padStart(2,'0')}</span><span className={`pill ${question.difficulty}`}>{question.difficulty.toUpperCase()}</span></div><h2>{question.prompt}</h2><p className="question-help">正しいと思うものを1つ選んでください。</p>
      <div className="option-list" role="group" aria-label="回答の選択肢">{question.options.map((option,i)=>{
        const submitted = result?.optionId===option.id;
        const correct = result?.correctOptionId===option.id;
        return <button key={option.id} type="button" disabled={!!result || pending || !signedIn} onClick={()=>setSelected(option.id)} aria-pressed={!result && selected===option.id} className={`option${selected===option.id&&!result?' chosen':''}${result&&correct?' correct':''}${result&&submitted&&!correct?' wrong':''}`}><span className="option-letter">{String.fromCharCode(65+i)}</span><span>{option.label}</span>{result&&correct?<Check size={18}/>:result&&submitted?<X size={18}/>:null}</button>;
      })}</div>
      {!signedIn?<div className="notice">回答と記録にはログインが必要です。<Link href="/account" className="section-link">アカウントへ →</Link></div>:null}
      {error?<p className="notice" role="alert">{error}</p>:null}
      {!result?<button className="button button-dark answer-submit" disabled={!selected||pending||!signedIn} onClick={submit}>{pending?'保存中…':'回答を確定する'} <ArrowRight size={17}/></button>:<div className="answer-reveal"><div className={`answer-state ${result.correct?'right':'incorrect'}`}>{result.correct?<Check size={21}/>:<X size={21}/>}<strong>{result.correct?'正解です！':'不正解です'}</strong>{!result.eligible?<small>学習用の回答</small>:null}{result.withdrawn?<small>この問題は訂正対象です</small>:null}</div><h3>答えのポイント</h3><p>{result.explanation}</p><div className="answer-source"><span>出典：{result.sourceName} · {new Date(result.sourcePublishedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'short',day:'numeric'})}</span><a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">元記事を読む <ArrowUpRight size={15}/></a></div><div className="answer-actions">{index+1<questions.length?<button className="button button-primary" onClick={()=>{setIndex(index+1);setSelected('');setError('');setReport(false);setReportDone(false);}}>次の問題へ <ArrowRight size={16}/></button>:<Link href="/" className="button button-primary">ホームへ戻る</Link>}{!reportDone?<button className="report-link" onClick={()=>setReport(!report)}><Flag size={14}/> 問題を報告</button>:<span className="subtle">報告を受け付けました</span>}</div>{report?<form onSubmit={reportProblem} className="report-form"><label htmlFor="reason">誤り・リンク切れの内容</label><textarea id="reason" name="reason" required minLength={10} maxLength={1000} placeholder="確認した内容を10文字以上で記入"/><button className="button button-ghost">報告する</button></form>:null}</div>}
    </section></div>;
}
