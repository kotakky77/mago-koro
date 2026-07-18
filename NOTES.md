# 作業メモ: Rails版 → Cloudflare Workers版への書き直し

（2026-07-18 作成。birthday-reminder の移行成功（同リポジトリの NOTES.md）を受けて、
mago-koro も Cloudflare に集約した記録）

## 移行の決定と理由

- **費用**: Workers Free（10万req/日）+ D1 Free（5GB）+ R2 Free（10GB, 転送料無料）で
  **月額0円**の見込み。家族数人の利用では余裕。写真が10GBを超えた場合のみ
  R2 $0.015/GB/月（数十円）
- **インフラ集約**: 静的サイト・birthday-reminder と合わせて Cloudflare に一本化
- **データ移行は不要**: Rails 版は本番稼働していなかった（deploy.yml がテンプレートのまま）
  ため、新規スタート
- **機能範囲**: コア機能のみ移行。おみやげ注文・管理者画面は**フェーズ2**として未移植
  （実装は `archive/rails/` にのみ存在）。GamesController はモデルもルートも無い
  未使用コードだったので移行対象外
- **デザイン**: 移行と同時に全画面を「温かみのあるモダン」へ刷新。
  高齢者向けガイドライン（16px以上・44pxタッチターゲット・高コントラスト）は維持

## 構成の対応表（Rails → Workers）

| Rails 側 | Workers 側 |
|---|---|
| MySQL + Active Record | D1 + 手書きSQLクエリ層（`src/lib/db.ts`） |
| Active Storage（写真） | **R2** + `photos` テーブル。キーは `children/<childId>/<uuid>` |
| has_secure_password (bcrypt) | WebCrypto PBKDF2-SHA256（`src/lib/auth.ts`） |
| session[:user_id] | ランダム256bitトークン + `sessions` テーブル |
| CSRF 保護 | Hono csrf ミドルウェア（Origin検証） |
| flash | Cookie 方式（`src/lib/flash.ts`） |
| ActionMailer + SMTP | Gmail API（`src/lib/gmail.ts`、パスワードリセットのみ） |
| ERB | hono/jsx SSR（`src/views/*.tsx`） |
| rate_limit | D1 の `login_attempts` テーブル（`src/lib/rate-limit.ts`） |
| PATCH/DELETE | POST ルート（`POST /children/:id/delete` 等） |

birthday-reminder から `auth.ts` / `flash.ts` / `gmail.ts` / `rate-limit.ts` と
wrangler/vitest/tsconfig の構成を流用。auth.ts は3ロール
（parent/grandparent/admin）対応に拡張した。

## 今回の新規設計ポイント

### 写真（Active Storage の代替）

- アップロード: multipart → Worker で JPEG/PNG・10MB以下を検証 → R2 put + D1 挿入。
  不正ファイルは名前付きでエラー表示（Rails版の purge 相当）
- **アップロード前にブラウザで縮小**（`src/client.js`）: 長辺2000px・JPEG85%に
  canvas で縮小してから送信。R2 無料枠10GBの節約とアップロード時間短縮
- 配信: `GET /photos/:id/file` で認可チェック（親=自分の子 or 祖父母=accepted招待あり）
  してから R2 を stream。`Cache-Control: private`。**公開バケットにはしない**
- 子ども削除時は R2 のキーも掃除してから DELETE（DB側は CASCADE）

### セキュリティ（Rails版の挙動を踏襲）

- パスワードリセット: 256bitトークンをメールにのみ含め、DBには SHA-256 ダイジェスト
  保存・2時間期限（Rails版と同じ）。レート制限も適用
- 招待トークン: 128bitランダム・7日期限・pending→accepted/expired のステータス管理
- ログイン: IP単位で 10回/3分 のレート制限、タイミング攻撃対策
  （ユーザー不在時のダミー検証・timing-safe比較）
- 認可拒否時、写真ファイルは 404 を返して存在の有無も漏らさない

### ハマりどころ（今後のために）

1. **Hono のサブルーター `use("*")` は合成後の全パスに効く。**
   `wishlistRoutes.use("*", requireParent())` のように書くと、後から登録した
   祖父母ルートまで親ロール必須になり全滅する。ミドルウェアは
   `use("/children/*", requireParent())` のようにパスを限定して掛けること
2. **`src/app.js` というファイル名は `app.tsx` と衝突する。** TypeScript が
   `import "./app.js"` を `app.tsx` のコンパイル済み出力と解釈するため。
   クライアントJSは `client.js` に改名した
3. `@cloudflare/workers-types` は v5 系が必要（wrangler 4 の peerDependency）
4. zsh は変数を単語分割しないので、curl のヘッダを変数に入れて `$O` で展開しても
   渡らない（検証スクリプトでの話）
5. **`node:22-bookworm-slim` には ca-certificates が入っていない。** workerd が
   外部TLS接続（Gmail API等）で "TLS peer's certificate is not trusted" になる。
   `Dockerfile.dev` で ca-certificates を入れて解決（compose は build 指定に変更）
6. **wrangler.jsonc の `database_id` を変えるとローカルD1も別DBになる**
   （ローカル状態がIDにひも付いているため）。本番ID記入後は
   `migrations apply --local` のやり直しが必要
7. **Gmail の実認証情報はどこにも平文で残っていない。** birthday-reminder の
   `.dev.vars` はダミー値で、本物は Cloudflare secrets（書き込み専用）と
   Google Cloud Console にのみ存在する。mago-koro の secrets 登録には
   Google Cloud Console の `birthday-reminder` プロジェクトから
   クライアントID/シークレットを取得し、refresh_token は手元に控えが無ければ
   `birthday-reminder/scripts/get-refresh-token.mjs` で再取得する

## 開発環境は Docker で包む（決定事項）

PCにNodeを入れない方針。`compose.yml` の `dev` サービス（node:22）内で
wrangler dev / test / deploy を全て実行する。

- `node_modules` は名前付きボリューム（workerd バイナリがプラットフォーム別のため、
  ホストと共有してはいけない）
- wrangler dev は `--ip 0.0.0.0` が必要（コンテナ外からのアクセス）
- デプロイ時はホストの wrangler OAuth 認証をマウントして使う:
  `docker compose run --rm -v "$HOME/Library/Preferences/.wrangler:/root/.config/.wrangler" dev npx wrangler deploy`

## 検証記録（2026-07-18、ローカル wrangler dev）

- `npm run typecheck` / vitest 27件 全パス
- curl による一気通貫: 親サインアップ → 子ども登録 → 写真アップロード →
  招待リンク発行 → 祖父母登録 → 写真閲覧 → 購入報告（メッセージ付き）→
  親に未読バッジ+通知 → 既読化 まで全て成功
- 拒否系: GIF・10MB超の写真 / 11件目のほしいもの（10件上限）/
  他人の子どもへのアクセス（別の親・無関係な祖父母、写真ファイルは404）/
  使用済み招待トークン / 未ログインアクセス / ログイン10回失敗のレート制限
- パスワードリセット: メール送信はGmail認証がダミーのため401（HTTP経路は到達確認済み。
  送信モジュールは birthday-reminder で実績あり）。リセットリンク以降のフロー
  （edit表示 → パスワード変更 → 新パスワードでログイン → トークン再利用拒否）は
  ダイジェストをローカルD1に直接仕込んで検証済み

## 本番セットアップ記録

- 2026-07-18: D1 作成（`mago-koro`, id: 6342f5a3-aa07-4ad0-9fcf-493643ba7be6, APAC）、
  リモートマイグレーション適用済み
- **R2 はアカウント未有効化のため保留** → Cloudflare ダッシュボードで R2 を有効化
  （支払い方法の登録が必要。無料枠内なら請求ゼロ）後に:
  1. `wrangler r2 bucket create mago-koro-photos`
  2. `wrangler deploy`
  3. Gmail シークレット3点を `wrangler secret put`（birthday-reminder と同じ値。
     手元の `birthday-reminder/.dev.vars` にある）
  4. 本番URLで主要フロー再確認（特にパスワードリセットメールの実受信）

## 後始末

- Rails 版一式は `archive/rails/` へ移動（README-ARCHIVE.md 参照）。
  本番稼働していなかったので停止作業は無し
- 旧 docker-compose.yml（web+MySQL）もアーカイブ内。ローカルの MySQL ボリュームが
  不要になったら `docker compose -p mago-koro down -v` 等で掃除してよい
