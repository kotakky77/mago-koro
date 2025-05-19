class Admin::UsersController < ApplicationController
  before_action :require_admin
  before_action :set_user, only: [:show, :edit, :update, :destroy]
  
  def index
    @users = params[:user_type].present? ? User.where(user_type: params[:user_type]) : User.all
    @users = @users.order(created_at: :desc)
  end
  
  def show
    if @user.parent?
      @children = @user.children
    end
  end
  
  def new
    @user = User.new
  end
  
  def create
    @user = User.new(user_params)
    
    if @user.save
      flash[:success] = "ユーザーを作成しました"
      redirect_to admin_user_path(@user)
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
  end
  
  def update
    if params[:user][:password].blank?
      params[:user].delete(:password)
      params[:user].delete(:password_confirmation)
    end
    
    if @user.update(user_params)
      flash[:success] = "ユーザー情報を更新しました"
      redirect_to admin_user_path(@user)
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    @user.destroy
    flash[:success] = "ユーザーを削除しました"
    redirect_to admin_users_path, status: :see_other
  end
  
  private
  
  def set_user
    @user = User.find(params[:id])
  end
  
  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation, :user_type)
  end
end
