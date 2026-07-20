class AdminsController < ApplicationController
  before_action :require_admin
  
  def dashboard
    @total_users = User.count
    @parent_users = User.where(user_type: 'parent').count
    @grandparent_users = User.where(user_type: 'grandparent').count
    @total_children = Child.count
    @total_orders = SouvenirOrder.count
    @pending_orders = SouvenirOrder.pending.count
  end

  def users
    @users = params[:user_type].present? ? User.where(user_type: params[:user_type]) : User.all
    @users = @users.order(created_at: :desc)
  end

  def souvenirs
    @souvenirs = Souvenir.all.order(created_at: :desc)
  end

  def souvenir_orders
    @orders = params[:status].present? ? SouvenirOrder.where(status: params[:status]) : SouvenirOrder.all
    @orders = @orders.order(created_at: :desc)
  end
end
