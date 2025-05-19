class SouvenirOrder < ApplicationRecord
  belongs_to :user  # 注文したユーザー（祖父母）
  belongs_to :souvenir  # 記念品
  belongs_to :child  # 孫
  
  validates :shipping_address, presence: true
  validates :recipient_name, presence: true
  validates :status, presence: true, inclusion: { in: %w(pending processing shipped delivered cancelled) }
  
  scope :pending, -> { where(status: 'pending') }
  scope :processing, -> { where(status: 'processing') }
  scope :shipped, -> { where(status: 'shipped') }
  scope :delivered, -> { where(status: 'delivered') }
  scope :cancelled, -> { where(status: 'cancelled') }
  scope :active, -> { where.not(status: 'cancelled') }
  
  def process!
    update(status: 'processing')
  end
  
  def ship!
    update(status: 'shipped')
  end
  
  def deliver!
    update(status: 'delivered')
  end
  
  def cancel!
    update(status: 'cancelled')
  end
end
