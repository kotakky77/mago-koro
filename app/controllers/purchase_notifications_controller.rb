class PurchaseNotificationsController < ApplicationController
  before_action :require_parent
  before_action :set_notification, only: [:show, :update]
  before_action :correct_parent, only: [:show, :update]
  
  def index
    @notifications = current_user.purchase_notifications.order(created_at: :desc)
  end
  
  def show
    @notification.mark_as_read! unless @notification.read?
    @wishlist_item = @notification.wishlist_item
    @grandparent = @notification.grandparent
    @child = @wishlist_item.child
  end
  
  def update
    @notification.mark_as_read!
    head :ok
  end
  
  private
  
  def set_notification
    @notification = PurchaseNotification.find(params[:id])
  end
  
  def correct_parent
    unless current_user == @notification.user
      flash[:danger] = "アクセス権限がありません"
      redirect_to parent_dashboard_path
    end
  end
end
