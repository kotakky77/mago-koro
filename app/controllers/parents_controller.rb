class ParentsController < ApplicationController
  before_action :require_parent
  
  def dashboard
    @children = current_user.children
    @unread_notifications_count = current_user.purchase_notifications.unread.count
    @recent_notifications = current_user.purchase_notifications.order(created_at: :desc).limit(5)
  end

  def invitations
    @children = current_user.children.includes(:invitations)
  end
end
