class UsersController < ApplicationController
  skip_before_action :require_login, only: [:new, :create]
  before_action :set_user, only: [:show, :edit, :update, :destroy]
  before_action :require_admin, only: [:index, :destroy]
  before_action :correct_user, only: [:show, :edit, :update]

  def index
    @users = User.all
  end

  def show
  end

  def new
    @user = User.new
  end

  def edit
  end

  def create
    @user = User.new(user_params)
    
    # デフォルトは親ユーザー
    @user.user_type = 'parent' unless @user.user_type.present?

    if @user.save
      log_in @user
      flash[:success] = "ようこそ！まごころおくりものへ！"
      
      if @user.parent?
        redirect_to parent_dashboard_path
      elsif @user.grandparent?
        redirect_to grandparent_dashboard_path
      else
        redirect_to root_path
      end
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @user.update(user_params)
      flash[:success] = "プロフィールを更新しました"
      redirect_to @user
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @user.destroy!
    flash[:success] = "ユーザーを削除しました"
    redirect_to users_path, status: :see_other
  end

  private
    def set_user
      @user = User.find(params[:id])
    end

    def user_params
      params.require(:user).permit(:name, :email, :password, :password_confirmation, :user_type)
    end
    
    # 正しいユーザーかどうか確認
    def correct_user
      @user = User.find(params[:id])
      unless current_user?(@user) || current_user.admin?
        flash[:danger] = "アクセス権限がありません"
        redirect_to(root_url)
      end
    end
end
