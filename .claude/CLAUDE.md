# まごころおくりもの (Mago-Koro)

祖父母と孫をつなぐWebアプリケーション。親が子ども（孫）の写真やほしいものリストを管理し、祖父母がそれを閲覧・購入報告できる。

**Cloudflare Workers + Hono (TypeScript, hono/jsx SSR) + D1 + R2** で動作する。
旧 Rails 版は `archive/rails/` にアーカイブ済み（メンテしない）。移行の経緯・設計判断・ハマりどころは `NOTES.md` を参照。

## ユーザーロール

- **親 (parent)**: 子ども情報・写真・ほしいものリスト管理、祖父母への招待
- **祖父母 (grandparent)**: 孫の写真閲覧、ほしいものリスト閲覧・購入報告
- **管理者 (admin)**: user_type としては存在するが画面は未実装（フェーズ2）

おみやげ注文（souvenirs）・管理者画面はフェーズ2として未移植。参照実装は `archive/rails/` にある。

## 技術スタック

- Cloudflare Workers / Hono + hono/jsx（SSR、Reactは不使用）
- D1（SQLite）: `migrations/*.sql` で管理
- R2: 写真の実体（`photos` テーブルがメタデータ、認可付き配信）
- Gmail API: パスワードリセットメールのみ
- Vitest: 純粋ロジックのユニットテスト
- クライアントJSは `src/client.js` のみ（フレームワーク不使用）

## 開発環境（Docker）

PCにNodeを入れず、コンテナ内で完結させる方針（`compose.yml` にコマンド一覧のコメントあり）。

```bash
docker compose run --rm dev npm install                                        # 初回
docker compose run --rm dev npx wrangler d1 migrations apply mago-koro --local # マイグレーション
docker compose up                                                              # http://localhost:8787
docker compose run --rm dev npm test                                           # Vitest
docker compose run --rm dev npm run typecheck                                  # tsc
```

デプロイ（ホストのwrangler認証をマウント）:

```bash
docker compose run --rm -v "$HOME/Library/Preferences/.wrangler:/root/.config/.wrangler" dev npx wrangler deploy
```

## プロジェクト構造

```
src/
├── index.ts          # エントリポイント
├── app.tsx           # ルート合成・認証ミドルウェア・静的ファイル配信
├── app-env.ts        # AppEnv型・Cookie名・dashboardPath
├── app.css           # 全スタイル（:root のCSS変数がデザイントークン）
├── client.js         # 確認ダイアログ・写真モーダル・アップロード前縮小
├── lib/              # auth / db(全SQLクエリ) / flash / gmail / rate-limit / mail-templates
├── routes/           # sessions / children / photos / wishlist-items /
│                     # invitations / grandparents / purchase-notifications
└── views/            # layout（renderPage・表示ヘルパー）+ 画面別 .tsx
migrations/           # D1マイグレーション（連番SQL）
test/                 # Vitest（*.test.ts）
archive/rails/        # 旧Rails版（触らない）
```

## コーディング規約・重要な注意

- SQLは `src/lib/db.ts` のクエリ層に集約（ルートハンドラに生SQLを散らかさない）
- フォームのPATCH/DELETEは使わず **POSTルート**（`POST /children/:id/delete` 等）
- **Honoのサブルーター `use("*")` は合成後の全パスに効く**。ロールガードは必ず
  `use("/children/*", requireParent())` のようにパスを限定して掛けること（NOTES.md参照）
- `src/app.js` という名前は `app.tsx` と衝突するため使わない（クライアントJSは `client.js`）
- CSS/SVG/client.js は wrangler.jsonc の rules で文字列 import して配信する
- 日時はUTCのISO文字列でDBに保存、表示時に `Asia/Tokyo` でフォーマット（`views/layout.tsx` のヘルパー）
- コメント・コミットメッセージは日本語OK

## 認証・認可

- セッション: ランダム256bitトークン + `sessions` テーブル、Cookie は httpOnly/secure/Lax
- パスワード: PBKDF2-SHA256 100,000回（bcryptはWorkersのCPU制限で使えない）
- `app.tsx` の順序が重要: 公開ルート（`/login`, `/signup`, `/invite/:token`, `/password_resets`）
  → ログイン必須ミドルウェア → 写真配信 → 親ルート → 祖父母ルート
- 所有権チェック: 親は `loadOwnChild`（routes/children.tsx）、祖父母は `grandparentHasChild`（lib/db.ts）
- 写真の認可拒否は404を返す（存在の有無も漏らさない）

## 検証

変更したら最低限:

1. `docker compose run --rm dev npm run typecheck && docker compose run --rm dev npm test`
2. `docker compose up` で対象フローを手で確認（curl でも可。POSTには
   `Origin: http://localhost:8787` ヘッダが必要 = CSRF対策）

## コードグラフ（graphify）— 任意ツール

**このリポジトリの開発に graphify は必須ではない。** 入れなくても通常の開発・
テスト・デプロイはすべて成立する。コード構造を俯瞰したいときだけ使う補助ツール。

以下のコマンドは graphify を導入した環境でのみ有効。未導入なら読み飛ばしてよい。

### 導入（各自のマシンで1回、host側。Dockerは不要）

```bash
uv tool install "graphifyy[sql]"   # uv 未導入なら brew install uv
uv tool update-shell               # ~/.local/bin を PATH に通す（要ターミナル再起動）
graphify install --project         # /graphify スキルを .claude/skills/ に配置（gitignore済み）
graphify extract . --code-only     # グラフ構築（AST のみ・API費用なし・5秒程度）
graphify cluster-only . --resolution 1.5 --no-label
```

`graphify install --project` はルート `CLAUDE.md` の作成と `.claude/settings.json` への
PreToolUse フック登録も同時に行う。**このリポジトリでは両方とも削除する方針**
（規約は `.claude/CLAUDE.md` に集約する。フックは87ファイル規模ではノイズになる）。

自動更新が欲しければ `graphify hook install`（post-commit / post-checkout）。
git hooks はバージョン管理できないので各自で実行すること。
`.gitattributes` に merge driver 行が追記されるが、`graphify-out/` は
gitignore しているので不要。戻すこと。

### 使い方

- `graphify affected "<関数名>" --depth 1` — これを変更したら影響が及ぶファイル。
  **`--depth 2` 以上は誤検出が混じる**（同じモジュールから別の物を import しただけで拾う）
- `graphify explain "<関数名>"` — 定義位置と参照元ファイルの列挙。
  認可関数（`grandparentHasChild` / `loadOwnChild` / `requireParent`）の
  呼び出し元監査に有効。ただし表示される行番号は**import行**であって呼び出し箇所ではない
- `graphify path "<A>" "<B>"` — 2つのシンボル間の最短経路
- `graphify export callflow-html` — ファイル単位に区切った Mermaid の呼び出しフロー図。
  アーキテクチャの俯瞰にはこれが一番読みやすい（`graph.html` のヘアボールより有用）。
  自動再生成されないので、見る前に叩き直すこと
- `graphify update .` — コード変更後の再構築（AST のみ、API費用なし）

### 制約

- グラフは `--code-only` で構築している。`.md` / モックHTML は LLM の意味解析パスが
  必要なため含まれない。`src/app.css` は CSS grammar が無く**どの構成でも解析対象外**
- `graphify query`（自然言語質問）は LLM バックエンド未設定だとキーワード起点の
  BFS に退化して使い物にならない。`explain` / `path` / `affected` を使うこと
- `graphify-out/` と `.claude/skills/` は gitignore 済み（生成物・ベンダーのコピーのため）
- `.graphifyignore` で `archive/`（旧Rails版）と設定ファイル類を除外している。
  これを外すとグラフが旧実装で埋まる
