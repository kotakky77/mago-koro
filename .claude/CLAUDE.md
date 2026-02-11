# まごころおくりもの (Mago-Koro)

祖父母と孫をつなぐWebアプリケーション。親が子ども（孫）の写真やほしいものリストを管理し、祖父母がそれを閲覧・購入できる。

## ユーザーロール

- **親 (parent)**: 子ども情報・写真・ほしいものリスト管理、祖父母への招待
- **祖父母 (grandparent)**: 孫の写真閲覧、ほしいものリスト閲覧・購入、おみやげ注文
- **管理者 (admin)**: ユーザー・おみやげ・注文の管理

## 技術スタック

- Ruby on Rails 7.1.2 / Ruby 3.4.2
- MySQL 8.0
- Hotwire (Turbo + Stimulus)
- Active Storage (写真管理)
- bcrypt (認証)
- Docker + Docker Compose (開発環境)
- GitHub Actions (CI)
- Kamal (デプロイ)

## 開発環境

### Docker での起動

```bash
docker compose up --build
```

アプリ: http://localhost:3000 / DB: localhost:3306

### シードデータ

```bash
docker compose exec web bin/rails db:seed
```

テストアカウント:
- 親: `parent@example.com` / `password`
- 祖父母: `grandparent@example.com` / `password`
- 管理者: `admin@example.com` / `password`

### DB操作

```bash
docker compose exec web bin/rails db:migrate
docker compose exec web bin/rails db:reset      # DB再作成+seed
```

## テスト

```bash
docker compose exec web bin/rails test           # ユニット/コントローラーテスト
docker compose exec web bin/rails test:system    # システムテスト (Capybara + Selenium)
```

## プロジェクト構造

```
app/
├── controllers/
│   ├── admin/              # 管理者向け (Admin::AdminsController 等)
│   ├── children/           # 子どもネスト (Children::PhotosController)
│   ├── parents_controller  # 親向けダッシュボード
│   ├── grandparents_controller  # 祖父母向けダッシュボード
│   └── sessions_controller # 認証
├── models/                 # User, Child, Invitation, WishlistItem,
│                           # PurchaseNotification, Souvenir, SouvenirOrder
├── views/
│   ├── admin/              # 管理者画面
│   ├── parents/            # 親向け画面
│   ├── grandparents/       # 祖父母向け画面
│   └── layouts/            # 共通レイアウト
└── javascript/
    └── controllers/        # Stimulus コントローラー
```

## ルーティング概要

- `/` - トップページ
- `/login`, `/logout` - 認証
- `/parent/dashboard` - 親ダッシュボード
- `/grandparent/dashboard` - 祖父母ダッシュボード
- `/admin/dashboard` - 管理者ダッシュボード
- `/children/:id/photos` - 写真管理
- `/children/:id/wishlist_items` - ほしいものリスト
- `/children/:id/invitations` - 祖父母招待
- `/souvenirs`, `/souvenir_orders` - おみやげ・注文

## コーディング規約

- RuboCop に準拠
- ビューは ERB テンプレート
- JavaScript は ImportMap + Stimulus
- コメント・コミットメッセージは日本語OK
- Rails 7 の Turbo 対応: `method: :delete` ではなく `data: { "turbo-method": :delete }` を使用

## 認証・認可

- セッションベース認証 (`session[:user_id]`)
- `ApplicationController` の before_action フィルターで権限チェック:
  - `require_login` / `require_parent` / `require_grandparent` / `require_admin`
- ログイン後は `user_type` に応じたダッシュボードへリダイレクト

## 注意事項

- Gemfile の ruby バージョン (`3.3.0`) と .ruby-version (`3.4.2`) に不整合あり（要統一）
- Dockerfile も `ruby:3.3.0` ベースで .ruby-version と不一致
- CI は現在 `workflow_dispatch`（手動トリガー）のみ
- `docs/` にプロダクト仕様書・画面設計・HTMLモックアップあり
