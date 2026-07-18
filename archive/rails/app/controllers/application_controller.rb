class ApplicationController < ActionController::Base
  include SessionsHelper
  
  before_action :require_login
  
  private
  
  def require_login
    unless logged_in?
      flash[:danger] = "ログインが必要です"
      redirect_to login_url
    end
  end
  
  def require_parent
    unless current_user&.parent?
      flash[:danger] = "アクセス権限がありません"
      redirect_to root_url
    end
  end
  
  def require_grandparent
    unless current_user&.grandparent?
      flash[:danger] = "アクセス権限がありません"
      redirect_to root_url
    end
  end
  
  def require_admin
    unless current_user&.admin?
      flash[:danger] = "管理者権限が必要です"
      redirect_to root_url
    end
  end
  
  def redirect_based_on_user_type
    if logged_in?
      if current_user.parent?
        redirect_to parent_dashboard_path
      elsif current_user.grandparent?
        redirect_to grandparent_dashboard_path
      elsif current_user.admin?
        redirect_to admin_dashboard_path
      end
    end
  end
end
