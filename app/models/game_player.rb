class GamePlayer < ApplicationRecord
  belongs_to :game
  belongs_to :user
  has_many :player_cards, dependent: :destroy
  has_many :cards, through: :player_cards
  
  validates :points, numericality: { only_integer: true }, allow_nil: true
  
  before_create :set_default_points
  
  private
  
  def set_default_points
    self.points ||= 0
  end
end
