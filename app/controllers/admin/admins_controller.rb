class Admin::AdminsController < ApplicationController
  before_action :require_admin

  def dashboard
    @total_users = User.count
    @parent_users = User.where(user_type: 'parent').count
    @grandparent_users = User.where(user_type: 'grandparent').count
    @total_children = Child.count
    @total_orders = SouvenirOrder.count
    @pending_orders = SouvenirOrder.pending.count
  end
end
