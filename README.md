# まごころおくりもの (Mago-Koro)

祖父母と孫をつなぐWebアプリケーション。親が子どもの写真やほしいものリストを管理し、
祖父母がそれを閲覧・購入報告できる。

**Cloudflare Workers + Hono (TypeScript) + D1 + R2** で動作する。
（旧 Rails 版は `archive/rails/` に保存。経緯は `NOTES.md` を参照）

## ユーザーロール

- **親 (parent)**: 子ども情報・写真・ほしいものリスト管理、祖父母への招待
- **祖父母 (grandparent)**: 孫の写真閲覧、ほしいものリスト閲覧・購入報告

（管理者・おみやげ注文はフェーズ2として未移植。実装は `archive/rails/` にある）

## 技術スタック

| 役割 | 技術 |
|------|------|
| 実行環境 | Cloudflare Workers（無料枠） |
| フレームワーク | Hono + hono/jsx（サーバーサイドレンダリング） |
| DB | Cloudflare D1（SQLite） |
| 写真ストレージ | Cloudflare R2（認可付き配信、公開バケットにしない） |
| メール送信 | Gmail API（パスワードリセットのみ） |
| 認証 | PBKDF2-SHA256 + セッショントークン（Cookie） |
| テスト | Vitest |

## 開発環境（Docker）

PCにNodeを入れず、コンテナ内で完結させる。

```bash
# 初回セットアップ
docker compose run --rm dev npm install
docker compose run --rm dev npx wrangler d1 migrations apply mago-koro --local

# 開発サーバー → http://localhost:8787
docker compose up

# テスト・型チェック
docker compose run --rm dev npm test
docker compose run --rm dev npm run typecheck
```

- ローカルの D1/R2 は `.wrangler/state/` にエミュレートされる（Cloudflareアカウント不要）
- パスワードリセットメールをローカルで試す場合は `.dev.vars` に
  `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` を記載

## デプロイ

```bash
# .env の CLOUDFLARE_API_TOKEN を使ってデプロイ（compose が env_file として読む）
docker compose run --rm dev npx wrangler whoami   # 認証確認
docker compose run --rm dev npx wrangler deploy
```

トークンは Cloudflare ダッシュボード（マイプロフィール → API トークン）で
テンプレート「Edit Cloudflare Workers」から発行し、`.env` に
`CLOUDFLARE_API_TOKEN=...` として置く（`.gitignore` の `/.env*` で除外済み）。
D1 と R2 をバインドしているので、Workers スクリプトだけの権限では deploy に失敗する。
コンテナ内で `wrangler login`（OAuth）は使えない（コールバックが
コンテナの 127.0.0.1 にバインドされるため、ホストのブラウザから届かない）。

必要な事前準備（済んでいれば不要）:

1. `wrangler d1 create mago-koro` → `wrangler.jsonc` の `database_id` に反映
2. Cloudflare ダッシュボードで R2 を有効化 → `wrangler r2 bucket create mago-koro-photos`
3. `wrangler d1 migrations apply mago-koro --remote`
4. Gmail シークレット登録（birthday-reminder と同じ認証情報）:
   `wrangler secret put GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`

## プロジェクト構造

```
src/
├── index.ts          # Workersエントリポイント
├── app.tsx           # ルーティング組み立て・認証ミドルウェア・静的ファイル
├── app.css           # 全スタイル（デザイントークンは:rootのCSS変数）
├── client.js         # 確認ダイアログ・写真モーダル・アップロード前縮小
├── lib/              # auth / db(クエリ層) / flash / gmail / rate-limit
├── routes/           # sessions / children / photos / wishlist-items /
│                     # invitations / grandparents / purchase-notifications
└── views/            # hono/jsx テンプレート（layout + 画面別）
migrations/           # D1マイグレーション
test/                 # Vitest（純粋ロジックのユニットテスト）
```

## 主要URL

- `/` トップ、`/login`、`/signup`（親の登録）
- `/parent/dashboard` 親マイページ、`/children/:id/{photos,wishlist_items,invitations}`
- `/invite/:token` 招待受諾（未ログイン可）→ 祖父母アカウント登録
- `/grandparent/dashboard` `/grandparent/photos` `/grandparent/wishlist_items`
- `/purchase_notifications` 購入通知（親）
