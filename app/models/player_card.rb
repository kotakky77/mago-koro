class PlayerCard < ApplicationRecord
  belongs_to :game_player
  belongs_to :card
  
  validates :quantity, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  before_create :set_default_quantity
  
  private
  
  def set_default_quantity
    self.quantity ||= 1
  end
end
