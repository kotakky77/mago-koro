class SouvenirOrdersController < ApplicationController
  before_action :require_login
  before_action :set_souvenir, only: [:new, :create]
  before_action :set_order, only: [:show]
  before_action :correct_user, only: [:show]
  
  def index
    @orders = current_user.souvenir_orders.order(created_at: :desc)
  end
  
  def show
  end
  
  def new
    @order = @souvenir.souvenir_orders.build
    
    # 祖父母ユーザーの場合は子供選択のために孫情報を取得
    if current_user.grandparent?
      @children = current_user.grandchildren
    end
  end
  
  def create
    @order = @souvenir.souvenir_orders.build(order_params)
    @order.user = current_user
    
    if @order.save
      flash[:success] = "注文を受け付けました"
      redirect_to souvenir_order_path(@order)
    else
      if current_user.grandparent?
        @children = current_user.grandchildren
      end
      render :new, status: :unprocessable_entity
    end
  end
  
  private
  
  def set_souvenir
    @souvenir = Souvenir.find(params[:souvenir_id])
  end
  
  def set_order
    @order = SouvenirOrder.find(params[:id])
  end
  
  def order_params
    params.require(:souvenir_order).permit(:child_id, :shipping_address, :recipient_name, :contact_phone)
  end
  
  def correct_user
    unless current_user == @order.user || current_user.admin?
      flash[:danger] = "アクセス権限がありません"
      redirect_to root_path
    end
  end
end
