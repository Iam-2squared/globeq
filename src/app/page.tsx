import { japanDate } from '@/lib/time';
import './home.css';

export const dynamic = 'force-dynamic';

export default function Home() {
  const today = japanDate();
  return <div className="home-page">
    <div className="welcome-line">
      <span className="page-label">GLOBEQ / JAPAN</span>
      <span className="today-date">{today.replaceAll('-', '.')} · JST</span>
    </div>

    <h1>GlobeQは、<br className="mobile-break" />現在準備中です。</h1>
    <p className="lead">サービス改善のため、新しい日次問題の公開を一時停止しています。再開までしばらくお待ちください。</p>

    <section className="home-hero" aria-label="GlobeQ 準備中">
      <div>
        <span className="eyebrow">SERVICE STATUS</span>
        <h2>ただいま準備中です。</h2>
        <p>新しいニュースQuizの自動生成は停止しています。公開済みデータはそのまま保持しています。</p>
        <div className="hero-meter">
          <div className="meter"><span style={{ width: '0%' }} /></div>
          <span>—</span>
        </div>
        <span className="hero-soon">再開時にお知らせします</span>
      </div>
      <div className="hero-orbit" aria-hidden="true">
        <div className="orbit-ring"><span>Q<span className="orbit-dot">.</span></span></div>
        <div className="orbit-small">NEWS<br />TO KNOW</div>
      </div>
    </section>
  </div>;
}
