class User < ApplicationRecord
  attr_accessor :reset_token
  
  validates :name, presence: true, length: { maximum: 50 }
  validates :email, presence: true, length: { maximum: 255 },
                    format: { with: /\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i },
                    uniqueness: { case_sensitive: false }
  validates :user_type, presence: true, inclusion: { in: %w(parent grandparent admin) }
  
  has_secure_password
  validates :password, presence: true, length: { minimum: 6 }, allow_nil: true
  
  # 親ユーザーの場合の関連
  has_many :children, dependent: :destroy
  has_many :created_invitations, class_name: 'Invitation', foreign_key: 'parent_id', dependent: :destroy
  has_many :purchase_notifications, dependent: :destroy
  
  # 祖父母ユーザーの場合の関連
  has_many :received_invitations, class_name: 'Invitation', foreign_key: 'grandparent_id'
  has_many :grandchildren, through: :received_invitations, source: :child
  
  # 共通の関連
  has_many :souvenir_orders, dependent: :destroy
  
  def parent?
    user_type == 'parent'
  end
  
  def grandparent?
    user_type == 'grandparent'
  end
  
  def admin?
    user_type == 'admin'
  end

  # 渡された文字列のハッシュ値を返す
  def User.digest(string)
    cost = ActiveModel::SecurePassword.min_cost ? BCrypt::Engine::MIN_COST :
                                                  BCrypt::Engine.cost
    BCrypt::Password.create(string, cost: cost)
  end

  # ランダムなトークンを返す
  def User.new_token
    SecureRandom.urlsafe_base64
  end

  # パスワード再設定の属性を設定する
  def create_reset_digest
    self.reset_token = User.new_token
    update_attribute(:reset_digest, User.digest(reset_token))
    update_attribute(:reset_sent_at, Time.zone.now)
  end

  # パスワード再設定のメールを送信する
  def send_password_reset_email
    create_reset_digest
    UserMailer.password_reset(self).deliver_now
  end

  # パスワード再設定の期限が切れている場合はtrueを返す
  def password_reset_expired?
    reset_sent_at < 2.hours.ago
  end

  # 渡されたトークンがダイジェストと一致したらtrueを返す
  def authenticated?(attribute, token)
    digest = send("#{attribute}_digest")
    return false if digest.nil?
    BCrypt::Password.new(digest).is_password?(token)
  end

  # ユーザーがアクティブかどうかチェック（今回は常にtrue）
  def activated?
    true
  end
end
