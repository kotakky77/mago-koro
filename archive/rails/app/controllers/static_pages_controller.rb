class StaticPagesController < ApplicationController
  skip_before_action :require_login, only: [:home]
  
  def home
    redirect_based_on_user_type if logged_in?
  end
end
