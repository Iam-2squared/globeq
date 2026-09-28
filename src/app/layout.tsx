import type { Metadata } from 'next';
import { Header, TabNav } from '@/components/shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'GlobeQ | ニュースを、確かな理解に。',
  description: '今日のニュースを4択で学び、出典を読む。GlobeQ by SOLUYRA。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><div className="app-shell"><Header /><main id="main" className="main-content">{children}</main><footer className="ai-disclaimer">GlobeQでは問題・要約・解説の作成にAIを使用しています。内容は必ずしも正確とは限りません。重要な情報は元記事・公的情報をご確認ください。</footer><TabNav /></div><script dangerouslySetInnerHTML={{__html:"window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}"}}/><script defer src="/_vercel/insights/script.js"></script></body></html>;
}
