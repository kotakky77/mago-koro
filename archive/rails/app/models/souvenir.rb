class Souvenir < ApplicationRecord
  has_many :souvenir_orders, dependent: :destroy
  
  validates :name, presence: true
  validates :price, presence: true, numericality: { greater_than: 0 }
  
  scope :active, -> { where(active: true) }
  
  def activate!
    update(active: true)
  end
  
  def deactivate!
    update(active: false)
  end
end
