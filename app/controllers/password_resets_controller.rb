class PasswordResetsController < ApplicationController
  skip_before_action :require_login
  
  before_action :set_user, only: [:edit, :update]
  before_action :valid_user, only: [:edit, :update]
  before_action :check_expiration, only: [:edit, :update]

  def new
  end

  def create
    @user = User.find_by(email: params[:password_reset][:email].downcase)
    if @user
      @user.create_reset_digest
      @user.send_password_reset_email
      flash[:info] = "パスワード再設定のメールを送信しました。メールをご確認ください。"
      redirect_to login_path
    else
      flash.now[:danger] = "そのメールアドレスは登録されていません"
      render 'new', status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if params[:user][:password].empty?
      @user.errors.add(:password, "パスワードを入力してください")
      render 'edit', status: :unprocessable_entity
    elsif @user.update(user_params)
      log_in @user
      @user.update_attribute(:reset_digest, nil)
      flash[:success] = "パスワードを変更しました"
      
      if @user.parent?
        redirect_to parent_dashboard_path
      elsif @user.grandparent?
        redirect_to grandparent_dashboard_path
      elsif @user.admin?
        redirect_to admin_dashboard_path
      else
        redirect_to root_path
      end
    else
      render 'edit', status: :unprocessable_entity
    end
  end

  private

    def user_params
      params.require(:user).permit(:password, :password_confirmation)
    end

    def set_user
      @user = User.find_by(email: params[:email])
    end

    # 有効なユーザーかどうか確認する
    def valid_user
      unless @user && @user.activated? && @user.authenticated?(:reset, params[:id])
        redirect_to root_url
      end
    end

    # トークンが期限切れかどうか確認する
    def check_expiration
      if @user.password_reset_expired?
        flash[:danger] = "パスワード再設定の期限が切れています"
        redirect_to new_password_reset_url
      end
    end
end
