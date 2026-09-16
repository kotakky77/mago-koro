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
- デプロイの認証は `.env` の `CLOUDFLARE_API_TOKEN`（2026-08-31 に切り替え。後述）:
  `docker compose run --rm dev npx wrangler deploy`

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

## 本番セットアップ記録（2026-07-18 実施）

**本番URL: <https://mago-koro.kotakky.workers.dev>**

- D1 作成（`mago-koro`, id: 6342f5a3-aa07-4ad0-9fcf-493643ba7be6, APAC）+
  リモートマイグレーション適用済み
- R2 有効化（ダッシュボードで支払い方法登録）→ `mago-koro-photos` バケット作成
- `wrangler deploy` 完了。本番でサインアップ → 子ども登録 → 写真アップロード
  （実R2）→ 配信 → 削除まで確認し、テストデータは全削除済み（users/children/photos = 0件）
- デプロイはホストのwrangler認証をコンテナにマウントして実行:
  `docker compose run --rm -v "$HOME/Library/Preferences/.wrangler:/root/.config/.wrangler" dev npx wrangler deploy`

### Gmail シークレット登録（2026-07-18 完了）

- birthday-reminder と同じ Google Cloud プロジェクトの認証情報3点
  （GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN）を
  `wrangler secret put` で登録済み。`.dev.vars` にも実値あり（ローカル送信テスト可）
- 本番からパスワードリセットメールの実送信を確認（302 = Gmail API 送信成功。
  失敗時は500になる実装）。確認後のテストユーザーは削除済み
- **これで全機能が本番で動作。移行は完了**

### 本番の運用メモ

- ログ確認: `npx wrangler tail mago-koro`（observability有効）
- 本番DBを直接見る: `npx wrangler d1 execute mago-koro --remote --command "SELECT ..."`
- 費用: Workers/D1/R2 いずれも無料枠内の想定。R2 の使用量はダッシュボードの
  R2 概要ページで確認できる

## 後始末

- Rails 版一式は `archive/rails/` へ移動（README-ARCHIVE.md 参照）。
  本番稼働していなかったので停止作業は無し
- 旧 docker-compose.yml（web+MySQL）もアーカイブ内。ローカルの MySQL ボリュームが
  不要になったら `docker compose -p mago-koro down -v` 等で掃除してよい

## フェーズ2: 記念品（おみやげ）注文 + 管理者画面（2026-07-20 実装）

`archive/rails/` の souvenirs / souvenir_orders / admin 系を移植した。
仕様の出どころ: `docs/product-spec.md` 4.4節、`docs/screen-design.md` 3〜4節、
`docs/screen-design-mock/`（grandparent-souvenirs / admin-*.html）。

### Rails版からの変更点

- `price` は decimal → INTEGER（円）
- `image_path`（実体管理が曖昧な文字列）→ `image_r2_key`（実体は R2 の
  `souvenirs/<uuid>`。写真と同じバケットを共用）
- 注文ステータスは一方向の遷移のみ許可（pending → processing → shipped →
  delivered、cancel は pending/processing からのみ）。Rails版は無制限だった
- 記念品の削除は注文0件のときのみ（履歴保護。通常は非掲載 `active=0` で運用）
- 管理者のユーザー管理は Rails 版同様に閲覧のみ（削除はカスケード + R2 掃除が
  絡むため、必要になったら別途）
- 商品画像の配信 `/souvenirs/:id/image` はログインのみ要求（カタログは全ロール
  共通の公開情報なので所有権チェックなし）

### 管理者アカウントの投入手順（サインアップ経路は無い）

```bash
# 1. パスワードダイジェストを生成
docker compose run --rm dev node scripts/hash-password.mjs '<パスワード>'

# 2. SQL で直接投入（ローカル。本番は --local を --remote に）
docker compose run --rm dev npx wrangler d1 execute mago-koro --local --command \
  "INSERT INTO users (name, email, password_digest, user_type) VALUES ('管理者', 'admin@example.com', '<1の出力>', 'admin')"
```

### 検証記録（2026-07-20、ローカル wrangler dev）

- typecheck / vitest 40件（新規13件含む）全パス
- curl 一気通貫: admin投入（スクリプト+SQL）→ adminログイン → 記念品登録
  （画像付き・なし）→ 非掲載切替 → 祖父母カタログ（activeのみ表示）→ 注文
  （孫選択・配送先）→ 注文履歴 → admin注文一覧 → pending→processing→shipped→
  delivered → 画像差し替え（R2キー更新）まで成功
- 拒否系: 不正遷移（pending→delivered / pending→shipped / delivered→cancelled）/
  注文のある記念品の削除 / 非掲載品の注文 / 招待外の child_id 注文(422) /
  住所なし(422) / 価格0(422) / 親→/admin/* / 親→/grandparent/souvenirs /
  祖父母→/admin/* / 未ログインの商品画像 → すべて拒否を確認
- ローカルD1に検証用データ（admin@example.com / adminpass 等）が残っている

### フェーズ2の本番反映（2026-07-20 実施）

- mainマージだけでは本番反映されない（CI/CDなし。デプロイは手動 `wrangler deploy`）
- リモートD1に 0002_souvenirs.sql 適用 → `wrangler deploy`（Version 884b60bd）
- 本番admin投入: `geiruzusi+admin@gmail.com`（Gmailの+付きエイリアス。
  email一意制約のため親アカウントと同一アドレスは不可、user_typeは単一値のため
  親兼任も不可 → 別アカウントとした）。ログイン・ダッシュボード表示確認済み
- 記念品カタログは未登録のため、admin で `/admin/souvenirs/new` から登録が必要
  → 2026-08-31 に登録済み（下記）

## 記念品カタログの初期登録（2026-08-31 実施）

Rails版 seeds（`archive/rails/db/seeds.rb`）と同じ3点を、本番 admin の
`/admin/souvenirs/new` から手動登録した。コード変更・デプロイは不要な運用作業。

| 商品名 | 価格 | 画像 |
|---|---|---|
| 子供の絵付きマグカップ | 2,500円 | souvenir-mug.jpg |
| 子供の絵付きTシャツ | 3,500円 | souvenir-tshirt.jpg |
| 子供の絵付きカレンダー | 2,000円 | souvenir-calendar.jpg |

- 一覧は `created_at DESC, id DESC` 順なので、**カレンダー → Tシャツ → マグカップ**の
  順に登録して、カタログの表示順をマグカップ→Tシャツ→カレンダーにした
  （本番の souvenir id は 1=カレンダー / 2=Tシャツ / 3=マグカップ）

### 商品画像の出典（すべて Pexels ライセンス。商用利用可・クレジット不要）

| 画像 | 出典 | 撮影者 |
|---|---|---|
| マグカップ | <https://www.pexels.com/photo/beverage-caffeine-coffee-cup-606542/> | Jessica Lewis |
| Tシャツ | <https://www.pexels.com/photo/white-t-shirt-hanging-on-a-rack-11671964/> | Marina Podrez |
| カレンダー | <https://www.pexels.com/photo/rustic-december-calendar-page-with-vintage-style-35013837/> | Marina Endzhirgli |

いずれも `.souvenir-image` の表示枠（`aspect-ratio: 4/3` / `object-fit: cover`）に
合わせて 4:3 にトリミング済み（macOS の `sips`、長辺853〜960px・JPEG・30〜250KB）。
ロゴ入りのマグカップや年号（2020/2021等）が写り込む候補は避けた。差し替えるときも
Pexels / Unsplash のようにライセンスの明確な素材を使うこと。

### 検証記録

- ローカル（wrangler dev）: admin で3点登録 → 祖父母アカウントでカタログ表示 →
  `/souvenirs/:id/image` が3件とも 200 image/jpeg。PC幅・390px幅ともレイアウト崩れなし
- 本番: `/admin/souvenirs` で3件「掲載中・画像あり・注文0件」、
  `/souvenirs/{1,2,3}/image` が表示されること（R2の実体まで）を確認
- 本番では試し注文をしていない（`souvenir_orders` に実データを残さないため）。
  注文フローの検証は 2026-07-20 のローカル一気通貫を参照

## デプロイ認証を API トークン方式に変更（2026-08-31）

ホストの wrangler OAuth トークン（`~/Library/Preferences/.wrangler/config/default.toml`）は
2026-07-20 で期限切れになり、マウント方式では
「非対話環境では CLOUDFLARE_API_TOKEN が必要」と言われて deploy も remote D1 も通らなくなった。

**コンテナ内 `wrangler login` は使えない。** OAuth のコールバックサーバーが
コンテナ内の `127.0.0.1:8976` にバインドされるため、`-p 8976:8976` で転送しても
（転送先はコンテナの外部インターフェース）届かず ERR_CONNECTION_RESET になる。
ブラウザ側の Authorize 自体は成功しているのに受け取りだけが落ちる、という紛らわしい失敗をする。

そこで API トークン方式に切り替えた:

1. ダッシュボード（マイプロフィール → API トークン）でテンプレート
   「Edit Cloudflare Workers」からトークンを発行。Account Resources は kotakky Account に限定
   （最小構成なら Account の Workers Scripts:Edit / D1:Edit / Workers R2 Storage:Edit /
   Account Settings:Read。**D1・R2 の権限は必須** — バインドしているため）
   - ⚠️ **このテンプレートには D1 が入っていない。**「アカウント → D1 → 編集」を手で足すこと
     （足し忘れても deploy は通り、リモートマイグレーションだけが落ちる。2026-09-16 に踏んだ。後述）
2. `.env` に `CLOUDFLARE_API_TOKEN=...`（`compose.yml` の `env_file` が読む。
   `.gitignore` の `/.env*` で除外済み）
3. `docker compose run --rm dev npx wrangler whoami` で確認 →
   `docker compose run --rm dev npx wrangler deploy`

これで `-v "$HOME/Library/Preferences/.wrangler:..."` のマウントは不要になった。
トークンが漏れたらダッシュボードから Roll / Delete で即失効できる。

### 祖父母マイページに記念品導線を追加（2026-08-31 デプロイ）

- カタログを公開しても祖父母の導線がヘッダーのリンクだけだったため、マイページに
  「🎁 記念品をおくる」カード（記念品を見る / 注文の履歴）を追加（PR #83）。
  注文履歴の戻りリンクも「← マイページに戻る」に統一
- `.claude/rules/ui-guidelines.md` の祖父母メニューの記述をフェーズ2後の実態に更新
- `wrangler deploy` 実行（Version 55805dd8-3558-47a7-b462-dca48b57d434）

## フェーズ3: 贈り物の調整（2026-09-12 着手）

**要件の正は [docs/requirements-phase3.md](docs/requirements-phase3.md)。** ここには実装の記録だけ置く。

方針の要点だけ再掲すると、**渡す相手を「実家の祖父母1組」に絞り、写真を主役から降ろした。**
相手は月1以上会えてLINEも使うので写真の価値が低く、**LINEで解けないのは
「何をあげたらいい?」と重複購入だけ**だったため。

### ほしいものリストのURLを任意にした（2026-09-12）

楓馬くん本人に聞いた2件が、**どちらも購入先URLを持たなかった**
（「スマホ、またはタブレット」「一緒にウォーキングするための靴」）。
URL必須のままでは、**子どもに聞いて代理入力する運用の初日に詰まる。**

- **`url TEXT NOT NULL` のまま空文字を許すので、マイグレーション不要。** ここが効いた
- `parseWishlistForm` から必須チェックを外し、**入力があったときの `^https?://` は残す**
- 親側（`views/wishlist.tsx`）はリンクを条件表示
- 祖父母側（`views/grandparent.tsx`）は空欄にせず
  **「商品ページの指定はありません。お店で選んでください」** と出す
  （UIガイドラインの「平易な日本語で」に合わせた。リンクが無いと何をすべきか分からないため）

### 検証記録（2026-09-12、ローカル wrangler dev）

- vitest 41件（新規1件含む）全パス / `tsc --noEmit` 通過
- curl 一気通貫: 親signup → 子ども登録 → **URL空で2件登録（302）** → 一覧にリンクが
  出ないこと → 招待発行 → `/invite/:token/register` で祖父母登録 →
  祖父母のほしいもの画面で**URLありは「商品ページを見る ↗」・URLなしは案内文**を確認
- 拒否系: `url=javascript:alert(1)` → **422（従来どおり拒否）**
- ローカルD1に検証用データが残っている（親1・子1・祖父母1・ほしいもの3件）
- **本番には一切触っていない**

### 誕生日お知らせメール（2026-09-12 実装）

孫の誕生日の **2週間前と1週間前**に、招待を承諾済みの祖父母へ送る。
祖父母が**アプリを見に来る理由がこれまで無かった**のを埋めるのが目的。

| 決めたこと | 中身 |
|---|---|
| 発火 | `"0 23 * * *"`（JST 8:00）。birthday-reminder が 7:00 なので**1時間ずらした** |
| 対象の引き方 | **「今日にN日足して、その月日の子を探す」向き。** 逆だと 12/30 + 14日 = 1/13 で壊れる |
| うるう日 | **2/29生まれは平年だと一生飛ばない**ので、3/1の回で拾う |
| 二重送信 | `birthday_notifications` の UNIQUE制約。**送信前に席を取り、失敗したら戻す** |
| リンク | `APP_BASE_URL`（Cronにはリクエストが無く origin を作れない） |

> ⚠️ **挿入できたかの判定に `meta.changes` を使わないこと。**
> ローカル検証で値が取れないケースを踏んだ。取り違えると claim が常に false になり、
> **「1通も送られないのに、エラーも出ない」**という一番見つけにくい壊れ方をする。
> `ON CONFLICT ... DO NOTHING RETURNING id` で、行が返ったかどうかで見る。

### 「これを贈ります」の事前表明（2026-09-12 実装）

購入報告は買った**後**しか表せず、実家と義実家の両方が贈るので買う前に被る。
`wishlist_items` に `reserved_by_id` / `reserved_at` を足した（status列への作り替えはしない）。

- 先におさえた人がいたら**上書きしない**（条件つきUPDATE + RETURNING）
- **取り消しは祖父母本人と親の両方ができる。** 押し間違いは前提なので逃げ道を必ず置く
- ほかの方が贈る予定の品には、祖父母の画面に**購入報告ボタンを出さない**。
  ただしPOST自体は受け付ける（**予約を見る前に買ってしまうことは実際に起きる**ので、
  「もう買った」を記録できないほうが困る）
- 購入報告が入ったら**表示は購入済みを優先**し、`reserved_*` は履歴として残す

### 検証記録（2026-09-12、ローカル wrangler dev）

- vitest 51件 / `tsc --noEmit` 通過
- **Cron**（`wrangler dev --test-scheduled` + `/__scheduled`）:
  - 該当なしの日 → `{ sent: 0, skipped: 0, failed: 0 }`（**Gmailを呼ばずに終わる**）
  - 該当あり・送信失敗（宛先をわざと壊した）→ `{ failed: 1 }` かつ**送信ログ0行**（席が戻る）
  - 該当あり・送信済み → `{ skipped: 1 }`（二重送信しない）
- **事前表明**（親1・子1・**祖父母2人**で一気通貫）:
  - 祖父母1が予約 → 祖父母2が同じ品を取る → **「ほかの方が先に」で弾かれる**
  - 画面: 祖父母1=取り消し+購入報告 / **祖父母2=フォームが1つも出ない** / 親=予定の取り消し
  - 親が外す → 祖父母2が取り直して購入報告 → **購入済みが優先表示**、`reserved_by_id` は残る
- 本番には一切触っていない（`wrangler deploy` は未実行）

### 本物の送信の検証（2026-09-13、ローカル wrangler dev + `.dev.vars` の実認証情報）

- 検証データの祖父母1人の宛先を自分のGmail（`+magokoro` エイリアス）に、
  孫の誕生日を「今日+14日」に一時変更して `/__scheduled` を叩いた
- 1回目 → `{ sent: 1 }`。**受信トレイに着信**（件名「まもなく楓馬さんのお誕生日です（9月27日・11歳）」、
  本文の年齢・残り日数・リストURLも期待どおり）
- 同日2回目 → `{ skipped: 1 }`（**本物の送信でも二重送信しない**）
- 検証後、宛先・誕生日・送信ログは元に戻した
- ハマりどころ: 祖父母の宛先を親と同じアドレスにすると `index_users_on_lower_email` の
  UNIQUE制約で落ちる。Gmailの `+` エイリアスで回避する

## フェーズ3 本番反映（2026-09-16 実施）

- リモートD1に `0003_birthday_notifications` / `0004_wishlist_reserved` を適用 → `wrangler deploy`
  （Version a851a22c-2724-4352-b794-0bce28999395、Cron `0 23 * * *` 登録）。トップ・ログイン 200 を確認
- **`.env` の `CLOUDFLARE_API_TOKEN` に D1 の権限が無く、リモートマイグレーションが
  `Authentication error [code: 10000]` で落ちた。** Workers・R2・Secret は通るので、
  8/31 にトークン方式へ切り替えてから D1 を触っていなかったため気づかなかった
  （テンプレート「Edit Cloudflare Workers」に D1 が含まれていない）。
  トークンに「アカウント → D1 → 編集」を追加して解決（トークン文字列は変わらない）
- デプロイ前に `docker compose run --rm dev npx wrangler d1 migrations list mago-koro --remote` で
  未適用を確かめると、権限不足もここで先に分かる。**マイグレーションが先、deploy は後**
