# 社用車管理クラウド（白ナンバー安全運転管理者対応）

Next.js（App Router）製の社用車管理アプリです。元の Google Apps Script 版と同じ機能
（運転日報／アルコール点呼、社用車台帳、運転者台帳、マスタ設定、ダッシュボード）を
Vercel にそのままデプロイできる構成にしています。

## 機能

- **ダッシュボード**: 本日の運行状況、車検・オイル交換・免許更新アラート、アルコール検知記録
- **運転日報**: 出発前／帰着後のアルコールチェック・点呼記録、走行距離の自動集計
- **社用車台帳**: 車検日・点検日・オイル交換目安・整備履歴の管理
- **運転者台帳**: 免許種別・更新期日・連絡先の管理
- **マスタ設定**: 部署、確認者、確認方法、整備種別、タイヤ種別、免許種別を自由に編集

## データの保存先

- **Upstash Redis（推奨・本番用）**: Vercel の Marketplace から Upstash（またはVercel KV）
  を接続すると、環境変数 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
  （または `KV_REST_API_URL` / `KV_REST_API_TOKEN`）が自動設定され、データが永続化されます。
- **未設定の場合**: `/tmp` 内の一時ファイルに保存するフォールバック動作をします。
  Vercel の Serverless 関数はインスタンスが再起動すると消えるため、**本番運用では
  必ず Upstash Redis（またはVercel KV）を接続してください。**

## ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:3000` で確認できます。ローカルでは `.data/fleet-data.json` にデータが保存されます。

## Vercel へのデプロイ

1. このプロジェクトを GitHub リポジトリにプッシュします。
2. [Vercel](https://vercel.com) で「Add New... > Project」からリポジトリをインポートします
   （フレームワークは自動的に Next.js と認識されます。ビルド設定の変更は不要です）。
3. **データ永続化のため、Storage タブから Upstash Redis（または Vercel KV）を作成して
   プロジェクトに接続してください。** 接続すると環境変数が自動的に追加されます。
4. （任意・推奨）Project Settings > Environment Variables で以下を設定すると、
   アプリ全体に Basic 認証がかかり社外からのアクセスを防げます。
   - `BASIC_AUTH_USER`: ログインユーザー名
   - `BASIC_AUTH_PASSWORD`: ログインパスワード
5. 「Deploy」をクリックすればデプロイ完了です。

CLIでデプロイする場合:

```bash
npm i -g vercel
vercel        # プレビューデプロイ
vercel --prod # 本番デプロイ
```

## 環境変数一覧（`.env.example` 参照）

| 変数名 | 必須 | 説明 |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | 推奨 | Upstash Redis の REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | 推奨 | Upstash Redis の REST トークン |
| `BASIC_AUTH_USER` | 任意 | Basic認証のユーザー名（設定時のみ有効化） |
| `BASIC_AUTH_PASSWORD` | 任意 | Basic認証のパスワード（設定時のみ有効化） |

## 技術構成

- Next.js 15（App Router） / React 19 / TypeScript
- API Routes（`app/api/**`）でデータの取得・保存・削除を提供
- `@upstash/redis` で永続化（未接続時は `/tmp` へのローカル保存にフォールバック）
- スタイルはプレーンCSS（`app/globals.css`）、外部UIライブラリ非依存

## 注意事項

このリポジトリの `npm install` はサンドボックス環境のネットワーク制限により
このセッション内では実行・検証できていません。TypeScriptの構文チェックは
手動で実施し問題は見つかりませんでしたが、初回は `npm install && npm run build`
をお手元の環境（またはVercelのビルド時）で実行して動作確認してください。
