# セキュリティ要件

## 認証

- パスワード: **PBKDF2-SHA256 100,000回**（`src/lib/auth.ts`）。bcryptはWorkersの
  CPU制限で使えない。形式 `pbkdf2-sha256$<iter>$<salt>$<hash>`
- セッション: ランダム256bitトークンを `sessions.token` に保存して照合。
  Cookieは `httpOnly / secure / sameSite=Lax`
- パスワードリセット: 256bitトークンをメールにのみ含め、DBには **SHA-256ダイジェスト**
  （`reset_digest`）を保存。有効期限2時間。使用後は必ずNULLクリア
- パスワード要件: 最低6文字（`PASSWORD_MIN_LENGTH`）

### コード変更時の注意

- パスワード・トークンの生値をDBやログに保存しない
- 認証比較は timing-safe（`auth.ts` の実装を使う。ユーザー不在時のダミー検証も維持）
- 乱数は必ず `crypto.getRandomValues`（`generateToken()`）

## 認可

### ロールベースアクセス制御

`app.tsx` のルート合成順が防御の土台（公開ルート → ログイン必須ミドルウェア → 各ルート群）。

- **重要**: Honoのサブルーター `use("*")` は合成後の全パスに効く。ロールガードは
  `use("/children/*", requireParent())` のようにパスを限定して掛ける
- ロールガード: `requireParent()`（routes/children.tsx）、祖父母は
  `use("/grandparent/*", ...)`（routes/grandparents.tsx）

### リソースの所有権チェック

- 親: `loadOwnChild(c, childId)` — 自分の子どもでなければ null → `deniedRedirect(c)`
- 祖父母: `grandparentHasChild(db, grandparentId, childId)` — accepted な招待の有無
- 写真配信 `/photos/:id/file` は認可拒否を **404** で返す（存在の有無も漏らさない）

### 新しいルート追加時のチェックリスト

- [ ] 公開ルートにする明確な理由があるか（招待受諾・パスワードリセットのみ）
- [ ] ロールガードのパスパターンが他ルート群を巻き込んでいないか
- [ ] 所有権チェック（loadOwnChild / grandparentHasChild）を通しているか
- [ ] 更新系はPOSTか（GETで状態変更しない）

## 入力バリデーション

- ユーザー入力は必ず検証する。バリデーションは関数に切り出してエクスポート
  （`validateNewUser` / `parseWishlistForm` / `validatePhotoFile` 方式）
- ファイルアップロード: content-type（JPEG/PNGのみ）とサイズ（10MB以下）をサーバー側で検証
  （client.js の縮小はあくまで補助）
- URL入力は `http(s)://` で始まることを検証（javascript: スキーム対策）
- SQLは必ず prepared statement の `.bind()`（文字列連結禁止）。`src/lib/db.ts` に集約

## CSRF対策

- `hono/csrf` ミドルウェア（Originヘッダ検証）を全ルートに適用（`app.tsx`）
- フォームは同一オリジンからの通常のPOSTのみ。curlで叩くときは
  `Origin: http://localhost:8787` を付ける

## トークン設計

| 用途 | 生成 | 保存 | 期限 |
|------|------|------|------|
| セッション | 256bit | 生値（token列） | Cookie 1年 |
| パスワードリセット | 256bit | SHA-256ダイジェスト | 2時間 |
| 招待 | 128bit | 生値（URL共有が前提のため） | 7日 + pending/accepted/expired 管理 |

## レート制限

- ログインとパスワードリセット申請: IP単位 10回/3分（`src/lib/rate-limit.ts`、
  D1 の `login_attempts`）

## 秘密情報

- Gmail認証情報は `wrangler secret put`（本番）/ `.dev.vars`（ローカル、gitignore済み）
- `wrangler.jsonc` にsecretを書かない（varsは公開情報のみ）
- ログに個人情報・トークンを出力しない
