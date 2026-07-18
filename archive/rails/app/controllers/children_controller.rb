class ChildrenController < ApplicationController
  before_action :require_parent
  before_action :set_child, only: [:show, :edit, :update, :destroy]
  before_action :correct_parent, only: [:show, :edit, :update, :destroy]
  
  def index
    @children = current_user.children
  end
  
  def show
    @wishlist_items = @child.wishlist_items
    @photos = @child.photos
  end
  
  def new
    @child = current_user.children.build
  end
  
  def create
    @child = current_user.children.build(child_params)
    
    if @child.save
      flash[:success] = "子供の情報を登録しました"
      redirect_to @child
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
  end
  
  def update
    if @child.update(child_params)
      flash[:success] = "子供の情報を更新しました"
      redirect_to @child
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    @child.destroy
    flash[:success] = "子供の情報を削除しました"
    redirect_to children_path, status: :see_other
  end
  
  private
  
  def set_child
    @child = Child.find(params[:id])
  end
  
  def child_params
    params.require(:child).permit(:name, :birthdate)
  end
  
  def correct_parent
    unless current_user == @child.user
      flash[:danger] = "アクセス権限がありません"
      redirect_to parent_dashboard_path
    end
  end
end
