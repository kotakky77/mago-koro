class Game < ApplicationRecord
  has_many :game_players, dependent: :destroy
  has_many :users, through: :game_players
  
  validates :title, presence: true
  validates :status, presence: true
  validates :max_players, presence: true, 
                        numericality: { only_integer: true, 
                                       greater_than_or_equal_to: 2, 
                                       less_than_or_equal_to: 4 }
  
  # ゲームのステータス
  enum status: {
    waiting: 'waiting',      # 待機中
    in_progress: 'in_progress', # 進行中
    completed: 'completed'   # 完了
  }
  
  # ゲームに参加できるかどうか
  def can_join?
    waiting? && game_players.count < max_players
  end
  
  # ゲームを開始できるかどうか
  def can_start?
    waiting? && game_players.count >= 2
  end
end
