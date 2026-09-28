'use client';
import { useState } from 'react';

export function BadgePicker({ badges, selected }: { badges: {id:string;title:string;description:string}[]; selected: string | null }) {
  const [current,setCurrent] = useState(selected);
  const [error,setError] = useState('');
  if (!badges.length) return <p className="subtle">最初の問題に答えるとバッジを獲得できます。</p>;
  return <><div className="badge-list">{badges.map(b=><button key={b.id} type="button" className={`badge-item${current===b.id?' selected':''}`} aria-pressed={current===b.id} onClick={async()=>{
    setError('');try{const r=await fetch('/api/account/badge',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({badgeId:b.id})});if(!r.ok)throw new Error('保存できませんでした。');setCurrent(b.id);}catch{setError('保存できませんでした。');}
  }}><span className="badge-emoji" aria-hidden="true">✦</span><span><strong>{b.title}</strong><small>{b.description}</small></span>{current===b.id?<span className="selected-label">表示中</span>:null}</button>)}</div>{error?<p role="alert" className="notice">{error}</p>:null}</>;
}
