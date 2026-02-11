# セキュリティ要件

## 認証

- **bcrypt** (`has_secure_password`) によるパスワードハッシュ化
- セッションベース認証: `session[:user_id]` でログイン状態を管理
- パスワードリセット: トークンベース、2時間で有効期限切れ
- パスワード要件: 最低6文字（`validates :password, length: { minimum: 6 }`）

### コード変更時の注意

- パスワードは**絶対に平文で保存しない**（`has_secure_password` を維持）
- セッション情報に機密データを格納しない（`user_id` のみ）
- パスワードリセットトークンは `SecureRandom.urlsafe_base64` で生成し、BCrypt でダイジェスト化して保存

## 認可

### ロールベースアクセス制御

`ApplicationController` の before_action フィルターで制御:

```ruby
before_action :require_login        # 全アクション共通
before_action :require_parent       # 親専用アクション
before_action :require_grandparent  # 祖父母専用アクション
before_action :require_admin        # 管理者専用アクション
```

### リソースの所有権チェック

各コントローラーで `correct_parent` / `correct_user` 等のフィルターを実装し、他ユーザーのリソースへのアクセスを防ぐ:

```ruby
# 例: 自分の子どもの情報のみアクセス可能
def correct_parent
  unless current_user == @child.user
    flash[:danger] = "アクセス権限がありません"
    redirect_to parent_dashboard_path
  end
end
```

### 新しいコントローラー追加時のチェックリスト

- [ ] `before_action :require_login` が適用されているか（または明示的に skip しているか）
- [ ] 適切なロールフィルター (`require_parent` 等) を設定しているか
- [ ] リソース所有権チェック (`correct_parent` 等) を実装しているか
- [ ] `skip_before_action` は必要最小限か（招待受諾、パスワードリセット等のみ）

## 入力バリデーション

### 既存のバリデーションパターン

```ruby
# User
validates :name, presence: true, length: { maximum: 50 }
validates :email, presence: true, length: { maximum: 255 },
                  format: { with: /\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i },
                  uniqueness: { case_sensitive: false }
validates :user_type, inclusion: { in: %w(parent grandparent admin) }

# Child - 写真バリデーション
# サイズ: 10MB以下、形式: JPEG/PNG のみ

# Invitation
validates :token, presence: true, uniqueness: true
validates :status, inclusion: { in: %w(pending accepted expired) }

# WishlistItem
# 子ども1人あたり最大10件
```

### 新機能追加時の原則

- ユーザー入力は**必ずバリデーション**する（presence, format, length, inclusion）
- ファイルアップロードは**サイズと形式を制限**する
- `params.require(:model).permit(:field1, :field2)` で Strong Parameters を使用
- URL パラメータやクエリ文字列も信頼しない

## CSRF 対策

- Rails デフォルトの CSRF 保護を使用
- レイアウトに `csrf_meta_tags` を含める
- フォームは Rails のフォームヘルパー (`form_with`) を使用（自動でトークン付与）
- DELETE 等は `button_to` + `data: { "turbo-method": :delete }` で実装（GET リンクにしない）

## ログ・情報漏洩防止

`config/initializers/filter_parameter_logging.rb` でフィルタ済み:

```ruby
:passw, :email, :secret, :token, :_key, :crypt, :salt, :certificate, :otp, :ssn, :cvv, :cvc
```

### 注意

- ログに個人情報やトークンを出力しない
- エラーメッセージでシステム内部情報を露出しない
- 本番環境では `config.consider_all_requests_local = false`

## 招待トークン

- `SecureRandom.urlsafe_base64(16)` で生成
- DB のユニーク制約で重複防止
- 有効期限: 7日間
- ステータス管理: pending → accepted / expired
- 招待受諾は `skip_before_action :require_login` で未ログインからアクセス可能

## 本番環境

- `force_ssl = true`（HTTPS 強制）
- `assume_ssl = true`（ロードバランサー背後を想定）
- エラー詳細は非表示
- `active_record.attributes_for_inspect = [:id]`（ログにIDのみ表示）

## 既知の改善検討事項

- CSP（Content Security Policy）が無効化されている（`content_security_policy.rb` がコメントアウト）
- ログイン試行のレート制限が未実装
- アカウントロックアウト機能が未実装
- 招待トークンがDBに平文保存されている（パスワードリセットトークンはハッシュ化済み）
