class Admin::AdminsController < ApplicationController
  before_action :require_admin

  def dashboard
    @total_users = User.count
    @parent_users = User.where(user_type: 'parent').count
    @grandparent_users = User.where(user_type: 'grandparent').count
    @total_children = Child.count
    @total_orders = SouvenirOrder.count
    @pending_orders = SouvenirOrder.pending.count
    @completed_orders = SouvenirOrder.where(status: 'completed').count
    @total_photos = 0 # Active Storageの画像数（実装時に調整）
    @recent_orders = SouvenirOrder.includes(:user, :souvenir).order(created_at: :desc).limit(5)
    @recent_users_parent = User.where(user_type: 'parent').order(created_at: :desc).limit(30).count
    @recent_users_grandparent = User.where(user_type: 'grandparent').order(created_at: :desc).limit(30).count
  end
end
