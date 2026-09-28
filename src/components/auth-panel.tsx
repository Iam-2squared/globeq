'use client';
import { useState, FormEvent } from 'react';

export function AuthPanel() {
  const [mode, setMode] = useState<'login'|'register'>('register');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setPending(true);setError('');
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ username:form.get('username'), password:form.get('password') }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? '操作に失敗しました。'); return; }
      window.location.reload();
    } catch { setError('通信に失敗しました。'); }
    finally { setPending(false); }
  }
  return <div className="card auth-card"><div className="auth-switch"><button className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('');}}>新規登録</button><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('');}}>ログイン</button></div>
    <h2>{mode==='register'?'GlobeQを始める':'おかえりなさい'}</h2><p className="subtle">メールアドレスは必要ありません。</p>
    <form className="form-stack" onSubmit={submit}><label><span className="field-label">ユーザー名</span><input className="field" name="username" required minLength={2} maxLength={32} autoComplete="username" /></label><label><span className="field-label">パスワード（6文字以上）</span><input className="field" name="password" type="password" required minLength={6} maxLength={128} autoComplete={mode==='register'?'new-password':'current-password'} /></label><button className="button button-primary" disabled={pending}>{pending?'処理中…':mode==='register'?'登録して始める':'ログイン'}</button>{error?<p className="notice" role="alert">{error}</p>:null}</form>
  </div>;
}

export function LogoutButton() {
  const [pending,setPending] = useState(false);
  return <button className="button button-ghost" disabled={pending} onClick={async()=>{setPending(true);try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(r.ok)window.location.reload();}finally{setPending(false);}}}>ログアウト</button>;
}
