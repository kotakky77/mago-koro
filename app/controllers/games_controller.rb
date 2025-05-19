class GamesController < ApplicationController
  before_action :set_game, only: [:show, :join, :start]
  before_action :logged_in_user

  def index
    @games = Game.all
  end

  def show
    @players = @game.game_players.includes(:user)
  end

  def new
    @game = Game.new
  end

  def create
    @game = Game.new(game_params)
    @game.status = 'waiting'

    if @game.save
      # ゲームを作成したユーザーを自動的に参加させる
      @game_player = GamePlayer.create(game: @game, user: current_user)
      redirect_to @game, notice: 'ゲームを作成しました。他のプレイヤーを待っています。'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def join
    if @game.can_join?
      # 既に参加しているかチェック
      unless @game.game_players.exists?(user_id: current_user.id)
        @game_player = GamePlayer.create(game: @game, user: current_user)
        redirect_to @game, notice: 'ゲームに参加しました。'
      else
        redirect_to @game, alert: '既にこのゲームに参加しています。'
      end
    else
      redirect_to games_path, alert: 'このゲームには参加できません。'
    end
  end

  def start
    # ゲームを開始するのは、ゲームの作成者のみ
    game_creator = @game.game_players.first.user
    
    if current_user == game_creator && @game.can_start?
      @game.update(status: 'in_progress')
      # ここでゲームの初期設定を行う
      initialize_game(@game)
      redirect_to @game, notice: 'ゲームを開始しました！'
    else
      redirect_to @game, alert: 'ゲームを開始できませんでした。'
    end
  end

  private
    def set_game
      @game = Game.find(params[:id])
    end

    def game_params
      params.require(:game).permit(:title, :max_players)
    end
    
    # ログイン済みユーザーかどうか確認
    def logged_in_user
      unless logged_in?
        flash[:danger] = "ログインしてください"
        redirect_to login_url, status: :see_other
      end
    end
    
    # ゲームの初期設定
    def initialize_game(game)
      # 初期カードなどの設定をここで行う
      # 実装は今後追加していく
    end
end
