class GrandparentsController < ApplicationController
  before_action :require_grandparent
  
  def dashboard
    @grandchildren = current_user.grandchildren
  end

  def photos
    @children = current_user.grandchildren
    
    # 特定の子供が指定されている場合はその子供の写真を表示
    if params[:child_id].present?
      @child = Child.find(params[:child_id])
      # 関連する孫かどうかチェック
      if @children.include?(@child)
        @photos = @child.photos
      else
        flash[:danger] = "アクセス権限がありません"
        redirect_to grandparent_dashboard_path
      end
    end
  end

  def wishlist_items
    @children = current_user.grandchildren
    
    # 特定の子供が指定されている場合はその子供のほしいものリストを表示
    if params[:child_id].present?
      @child = Child.find(params[:child_id])
      # 関連する孫かどうかチェック
      if @children.include?(@child)
        @wishlist_items = @child.wishlist_items.order(created_at: :desc)
      else
        flash[:danger] = "アクセス権限がありません"
        redirect_to grandparent_dashboard_path
      end
    end
  end

  def souvenirs
    @active_souvenirs = Souvenir.active
    @children = current_user.grandchildren
  end
end
