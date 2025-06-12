class Admin::SouvenirsController < ApplicationController
  before_action :require_admin
  before_action :set_souvenir, only: [:show, :edit, :update, :destroy, :activate, :deactivate]
  
  def index
    @souvenirs = Souvenir.all
    
    # ステータスフィルタリング
    if params[:status] == 'active'
      @souvenirs = @souvenirs.where(active: true)
    elsif params[:status] == 'inactive'
      @souvenirs = @souvenirs.where(active: false)
    end
    
    @souvenirs = @souvenirs.order(created_at: :desc)
  end
  
  def show
    @orders = @souvenir.souvenir_orders.order(created_at: :desc)
  end
  
  def new
    @souvenir = Souvenir.new
  end
  
  def create
    @souvenir = Souvenir.new(souvenir_params)
    
    if @souvenir.save
      flash[:success] = "記念品を登録しました"
      redirect_to admin_souvenir_path(@souvenir)
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
  end
  
  def update
    if @souvenir.update(souvenir_params)
      flash[:success] = "記念品情報を更新しました"
      redirect_to admin_souvenir_path(@souvenir)
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    @souvenir.destroy
    flash[:success] = "記念品を削除しました"
    redirect_to admin_souvenirs_path, status: :see_other
  end
  
  def activate
    @souvenir.activate!
    flash[:success] = "記念品を有効化しました"
    redirect_to admin_souvenir_path(@souvenir)
  end
  
  def deactivate
    @souvenir.deactivate!
    flash[:success] = "記念品を無効化しました"
    redirect_to admin_souvenir_path(@souvenir)
  end
  
  private
  
  def set_souvenir
    @souvenir = Souvenir.find(params[:id])
  end
  
  def souvenir_params
    params.require(:souvenir).permit(:name, :description, :price, :active, :image_path)
  end
end
