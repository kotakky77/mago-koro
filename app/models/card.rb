class Card < ApplicationRecord
  has_many :player_cards
  has_many :game_players, through: :player_cards
  
  validates :name, presence: true
  validates :card_type, presence: true
  validates :cost, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  
  # カードタイプの定義
  enum card_type: {
    landmark: 'landmark',  # ランドマーク（建物）
    establishment: 'establishment'  # 施設
  }
end
