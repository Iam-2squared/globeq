import Link from 'next/link';
import { House, Newspaper, CircleHelp, Trophy, UserRound, Globe2 } from 'lucide-react';

export function Header() {
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand" aria-label="GlobeQ ホーム"><span className="brand-mark"><Globe2 size={22} strokeWidth={2.2} /></span><span>Globe<span className="brand-q">Q</span><small>by SOLUYRA</small></span></Link>
      <span className="region-pill"><span className="region-dot" /> JAPAN</span>
    </div>
  </header>;
}

const tabs = [
  { href: '/', label: 'Home', icon: House },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/quiz', label: 'Quiz', icon: CircleHelp, center: true },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/account', label: 'Account', icon: UserRound },
];

export function TabNav() {
  return <nav className="tab-nav" aria-label="メインナビゲーション">{tabs.map(({ href, label, icon: Icon, center }) =>
    <Link className={center ? 'tab-link tab-center' : 'tab-link'} key={href} href={href} aria-label={label}>
      <span className="tab-icon"><Icon size={center ? 26 : 22} strokeWidth={center ? 2.4 : 1.8} /></span><span>{label}</span>
    </Link>
  )}</nav>;
}
