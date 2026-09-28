import { ArrowUpRight, Search, Newspaper } from 'lucide-react';
import { configured } from '@/lib/db';
import { newsSearch } from '@/lib/data';
import './news.css';

export const dynamic = 'force-dynamic';
export default async function News({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const query = (typeof q === 'string' ? q : '').trim().slice(0, 80);
  const news = configured() ? await newsSearch(query) : [];
  return <div className="news-page"><span className="page-label">DISCOVER / JAPAN</span><h1>ニュースを読む。</h1><p className="lead">答えの向こうにある出来事を、自分の言葉で理解する。</p>
    <form action="/news" className="search-form"><Search size={20} aria-hidden="true" /><input name="q" defaultValue={query} placeholder="タイトル・要約・タグを検索" aria-label="ニュースを検索" maxLength={80}/><button type="submit">検索</button></form>
    <div className="section-heading news-heading"><h2>{query ? `「${query}」の検索結果` : '新着ニュース'}</h2><span className="subtle">{news.length} 件表示</span></div>
    {news.length ? <div className="news-list">{news.map((article) => <article key={article.id} className="card news-card"><div className="news-card-top"><span className="pill">{article.category}</span><time>{new Date(article.publishedAt).toLocaleString('ja-JP',{ timeZone:'Asia/Tokyo', month:'long',day:'numeric',hour:'2-digit',minute:'2-digit' })} JST</time></div><h3>{article.title}</h3><p>{article.summary}</p><div className="news-card-bottom"><span><Newspaper size={16}/> {article.sourceName}</span><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">元記事を読む <ArrowUpRight size={16}/></a></div>{article.tags.length ? <div className="news-tags">{article.tags.map(tag=><span key={tag}>#{tag}</span>)}</div> : null}</article>)}</div>
      : <div className="empty-state"><strong>{query ? '該当するニュースはありません' : '公開されたニュースはまだありません'}</strong><span>{query ? '別のキーワードでお試しください。' : '出典を確認した記事だけを公開します。'}</span></div>}
  </div>;
}
