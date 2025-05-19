class User < ApplicationRecord
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
end
