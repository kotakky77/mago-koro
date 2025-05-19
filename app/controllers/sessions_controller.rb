class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:new, :create]
  
  def new
    redirect_based_on_user_type if logged_in?
  end

  def create
    user = User.find_by(email: params[:session][:email].downcase)
    if user && user.authenticate(params[:session][:password])
      log_in user
      
      if user.parent?
        redirect_to parent_dashboard_path
      elsif user.grandparent?
        redirect_to grandparent_dashboard_path
      elsif user.admin?
        redirect_to admin_dashboard_path
      else
        redirect_to root_path
      end
    else
      flash.now[:danger] = 'メールアドレスまたはパスワードが正しくありません'
      render 'new', status: :unprocessable_entity
    end
  end

  def destroy
    log_out
    redirect_to root_url, status: :see_other
  end
end
