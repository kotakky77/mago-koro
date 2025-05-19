class WishlistItem < ApplicationRecord
  belongs_to :child
  has_many :purchase_notifications, dependent: :destroy
  
  validates :name, presence: true
  validates :url, presence: true
  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  
  scope :purchased, -> { where(purchased: true) }
  scope :not_purchased, -> { where(purchased: false) }
  
  def mark_as_purchased(grandparent_user)
    transaction do
      update(purchased: true, purchased_by_id: grandparent_user.id, purchased_at: Time.current)
      
      # 親ユーザーに通知を送る
      parent_user = child.user
      parent_user.purchase_notifications.create!(
        wishlist_item_id: id,
        grandparent_id: grandparent_user.id
      )
    end
  end
end
