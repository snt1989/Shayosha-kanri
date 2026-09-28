import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '社用車管理クラウド（白ナンバー法令対応）',
  description: '運転日報・アルコール点呼・車両台帳・運転者台帳・マスタ設定',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
