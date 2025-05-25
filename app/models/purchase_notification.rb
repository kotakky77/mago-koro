class PurchaseNotification < ApplicationRecord
  belongs_to :user
  belongs_to :wishlist_item
  belongs_to :grandparent, class_name: 'User', foreign_key: 'grandparent_id'
  
  validates :user_id, presence: true
  validates :wishlist_item_id, presence: true
  validates :grandparent_id, presence: true
  
  scope :unread, -> { where(read: false) }
  scope :read, -> { where(read: true) }
  
  def mark_as_read!
    update(read: true)
  end

  def item_name
    wishlist_item&.name
  end

  def purchaser_name
    grandparent&.name
  end
end
