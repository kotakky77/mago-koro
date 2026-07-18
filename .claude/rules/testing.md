# テスト方針・書き方のルール

## テストフレームワーク

- **Vitest** を使用（`test/*.test.ts`）。Node上で純粋ロジックだけをテストする
- D1・R2・Honoルートの結合確認は **`docker compose up`（wrangler dev）+ curl/ブラウザ**で行う
  （D1/R2はローカルにエミュレートされるので、Cloudflareアカウント不要）

## テスト実行コマンド

```bash
docker compose run --rm dev npm test           # 全テスト
docker compose run --rm dev npm run typecheck  # 型チェック（テストとセットで回す）
docker compose run --rm dev npx vitest run test/auth.test.ts  # 単体ファイル
```

## 何をVitestでテストするか

DBに触らない純粋関数を対象にする。ルートハンドラ自体はテストしない。

- `src/lib/auth.ts`: hashPassword/verifyPassword、validateNewUser、メール正規化
- `src/lib/db.ts` の純粋部分: invitationExpired 等（クエリ関数は対象外）
- `src/routes/*.tsx` からエクスポートしたバリデーション関数:
  parseWishlistForm、validatePhotoFile 等
- `src/lib/gmail.ts` / `mail-templates.ts`: MIME組み立て・文面

テストしやすくするため、**バリデーションはハンドラに埋め込まず関数に切り出して
エクスポートする**（parseWishlistForm 方式）。

## 結合確認（wrangler dev + curl）

POSTにはCSRF対策で `Origin: http://localhost:8787` ヘッダが必須。
セッションは `-c jar` / `-b jar` でCookieを持ち回す。

```bash
curl -s -c parent.jar -H "Origin: http://localhost:8787" \
  -d "name=太郎&email=p@example.com&password=password&password_confirmation=password" \
  http://localhost:8787/signup
curl -s -b parent.jar http://localhost:8787/parent/dashboard
```

## 必ず確認すべき項目

### 認証・認可（変更のたびに）

- 未ログイン時に `/login` へリダイレクトされること
- 権限のないロールでアクセスした場合に拒否されること（祖父母が親画面等）
- **他ユーザーのリソースにアクセスできないこと**（別の親の子ども、招待されていない
  祖父母からの写真URL直叩き→404）

### データ操作

- CRUDの正常系 + バリデーションエラー時に422でフォーム再表示されること
- 上限系: ほしいもの10件/子ども、写真10MB・JPEG/PNGのみ
- 招待: 使用済み/期限切れトークンの拒否

## 過去の一気通貫チェックリスト

NOTES.md の「検証記録」参照。新機能追加時も同じ粒度（正常系＋拒否系）で確認する。
