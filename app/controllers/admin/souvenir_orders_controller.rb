class Admin::SouvenirOrdersController < ApplicationController
  before_action :require_admin
  before_action :set_order, only: [:show, :process_order, :ship, :deliver, :cancel]
  
  def index
    @orders = params[:status].present? ? SouvenirOrder.where(status: params[:status]) : SouvenirOrder.all
    @orders = @orders.order(created_at: :desc)
  end
  
  def show
    @souvenir = @order.souvenir
    @user = @order.user
    @child = @order.child
  end
  
  def process_order
    @order.process!
    flash[:success] = "注文を処理中に更新しました"
    redirect_to admin_souvenir_order_path(@order)
  end
  
  def ship
    @order.ship!
    flash[:success] = "注文を発送済みに更新しました"
    redirect_to admin_souvenir_order_path(@order)
  end
  
  def deliver
    @order.deliver!
    flash[:success] = "注文を配達完了に更新しました"
    redirect_to admin_souvenir_order_path(@order)
  end
  
  def cancel
    @order.cancel!
    flash[:success] = "注文をキャンセルしました"
    redirect_to admin_souvenir_order_path(@order)
  end
  
  private
  
  def set_order
    @order = SouvenirOrder.find(params[:id])
  end
end
