class ParentsController < ApplicationController
  before_action :require_parent
  
  def dashboard
    @children = current_user.children
    @unread_notifications_count = current_user.purchase_notifications.unread.count
  end
end
