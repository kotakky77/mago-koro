class WishlistItemsController < ApplicationController
  before_action :require_login
  before_action :set_child, only: [:index, :new, :create]
  before_action :set_wishlist_item, only: [:show, :edit, :update, :destroy, :purchase]
  before_action :correct_parent, only: [:new, :create, :edit, :update, :destroy]
  
  def index
    if @child
      # 親ユーザーが子供のほしいものリストを見る場合
      @wishlist_items = @child.wishlist_items.order(created_at: :desc)
    elsif current_user.grandparent?
      # 祖父母ユーザーが見る場合
      child_ids = current_user.grandchildren.pluck(:id)
      @wishlist_items = WishlistItem.where(child_id: child_ids).order(created_at: :desc)
    else
      redirect_to parent_dashboard_path
    end
  end
  
  def show
    @child = @wishlist_item.child
  end
  
  def new
    @wishlist_item = @child.wishlist_items.build
  end
  
  def create
    @wishlist_item = @child.wishlist_items.build(wishlist_item_params)
    
    if @wishlist_item.save
      flash[:success] = "ほしいものリストに商品を追加しました"
      redirect_to child_wishlist_items_path(@child)
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
    @child = @wishlist_item.child
  end
  
  def update
    if @wishlist_item.update(wishlist_item_params)
      flash[:success] = "ほしいものの情報を更新しました"
      redirect_to child_wishlist_items_path(@wishlist_item.child)
    else
      @child = @wishlist_item.child
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    child = @wishlist_item.child
    @wishlist_item.destroy
    flash[:success] = "ほしいものリストから削除しました"
    redirect_to child_wishlist_items_path(child), status: :see_other
  end
  
  def purchase
    # 祖父母ユーザーのみ購入操作ができる
    if current_user.grandparent?
      @wishlist_item.mark_as_purchased(current_user)
      flash[:success] = "購入操作を完了しました。親御さんに通知が送られました。"
      redirect_to wishlist_item_path(@wishlist_item)
    else
      flash[:danger] = "この操作はできません"
      redirect_to wishlist_item_path(@wishlist_item)
    end
  end
  
  private
  
  def set_child
    @child = Child.find(params[:child_id]) if params[:child_id]
  end
  
  def set_wishlist_item
    @wishlist_item = WishlistItem.find(params[:id])
  end
  
  def wishlist_item_params
    params.require(:wishlist_item).permit(:name, :url, :price, :description, :category, :quantity)
  end
  
  def correct_parent
    if @child
      unless current_user == @child.user
        flash[:danger] = "アクセス権限がありません"
        redirect_to parent_dashboard_path
      end
    elsif @wishlist_item
      unless current_user == @wishlist_item.child.user
        flash[:danger] = "アクセス権限がありません"
        redirect_to parent_dashboard_path
      end
    end
  end
end
