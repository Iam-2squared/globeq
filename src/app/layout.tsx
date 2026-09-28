import type { Metadata } from 'next';
import { Header, TabNav } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlobeQ | ニュースを、確かな理解に。',
  description: '今日のニュースを4択で学び、出典を読む。GlobeQ by SOLUYRA。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><div className="app-shell"><Header /><main id="main" className="main-content">{children}</main><TabNav /></div></body></html>;
}
