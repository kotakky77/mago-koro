# テスト方針・書き方のルール

## テストフレームワーク

- **Minitest**（Rails デフォルト）を使用。RSpec は使わない
- **Capybara + Selenium** (headless Chrome) でシステムテスト
- **fixtures** でテストデータを管理（FactoryBot は未導入）
- 並列実行有効: `parallelize(workers: :number_of_processors)`

## テスト実行コマンド

```bash
# Docker 環境
docker compose exec web bin/rails test              # ユニット/コントローラー
docker compose exec web bin/rails test:system        # システムテスト
docker compose exec web bin/rails test test:system   # 全テスト

# 単体ファイル実行
docker compose exec web bin/rails test test/models/user_test.rb
docker compose exec web bin/rails test test/controllers/sessions_controller_test.rb
```

## テストファイルの配置

```
test/
├── models/           # モデルテスト (ActiveSupport::TestCase)
├── controllers/      # コントローラーテスト (ActionDispatch::IntegrationTest)
├── system/           # システムテスト (ApplicationSystemTestCase)
├── mailers/          # メーラーテスト (ActionMailer::TestCase)
├── helpers/          # ヘルパーテスト
├── integration/      # 統合テスト
└── fixtures/         # YAML フィクスチャ
```

## テストの書き方

### モデルテスト

```ruby
require "test_helper"

class UserTest < ActiveSupport::TestCase
  # フィクスチャの参照
  setup do
    @user = users(:parent_user)
  end

  # バリデーションテスト
  test "should not save user without name" do
    @user.name = nil
    assert_not @user.valid?
  end

  # 関連テスト
  test "parent should have children" do
    assert_respond_to @user, :children
  end

  # メソッドテスト
  test "should return correct user type" do
    assert @user.parent?
  end
end
```

### コントローラーテスト

```ruby
require "test_helper"

class ParentsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @parent = users(:parent_user)
    # ログインが必要なコントローラーではセッションをセットアップ
    post login_url, params: { session: { email: @parent.email, password: "password" } }
  end

  test "should get dashboard" do
    get parent_dashboard_url
    assert_response :success
  end

  test "should redirect when not logged in" do
    delete logout_url
    get parent_dashboard_url
    assert_redirected_to login_url
  end
end
```

### システムテスト

```ruby
require "application_system_test_case"

class LoginTest < ApplicationSystemTestCase
  test "user can log in and see dashboard" do
    visit login_url
    fill_in "メールアドレス", with: "parent@example.com"
    fill_in "パスワード", with: "password"
    click_on "ログイン"
    assert_text "ダッシュボード"
  end
end
```

## フィクスチャの書き方

`test/fixtures/users.yml` の例:

```yaml
parent_user:
  name: "テスト太郎"
  email: "parent@example.com"
  password_digest: <%= BCrypt::Password.create("password") %>
  user_type: parent

grandparent_user:
  name: "テスト義男"
  email: "grandparent@example.com"
  password_digest: <%= BCrypt::Password.create("password") %>
  user_type: grandparent

admin_user:
  name: "管理者"
  email: "admin@example.com"
  password_digest: <%= BCrypt::Password.create("password") %>
  user_type: admin
```

## テストで必ず確認すべき項目

### 認証・認可

- 未ログイン時にログインページへリダイレクトされること
- 権限のないロールでアクセスした場合に拒否されること（親が管理者画面にアクセスできない等）
- 他ユーザーのリソースにアクセスできないこと（他の親の子ども情報にアクセスできない等）

### データ操作

- CRUD 操作が正しく動作すること
- `assert_difference("Model.count")` でレコード数の増減を検証
- バリデーションエラー時に適切なレスポンスが返ること

### 現在のテスト状況

ほとんどのテストファイルはスケルトン状態（空）。以下の優先度で実装する:

1. **モデルテスト**: バリデーション・関連・メソッドの検証
2. **コントローラーテスト**: 認証・認可・CRUD の検証
3. **システムテスト**: 主要ユーザーフロー（ログイン、写真アップロード、購入）の検証
