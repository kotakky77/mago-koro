class Children::PhotosController < ApplicationController
  before_action :require_parent
  before_action :set_child
  before_action :correct_parent
  
  def index
    @photos = @child.photos
  end
  
  def create
    if params[:photos].present?
      params[:photos].each do |photo|
        @child.photos.attach(photo)
      end
      
      # サイズと形式の検証
      @child.validate_photo_size
      @child.validate_photo_format
      
      if @child.errors.any?
        flash[:danger] = @child.errors.full_messages.join(', ')
      else
        flash[:success] = "写真をアップロードしました"
      end
    else
      flash[:danger] = "写真を選択してください"
    end
    
    redirect_to child_photos_path(@child)
  end
  
  def destroy
    @photo = @child.photos.find(params[:id])
    @photo.purge
    flash[:success] = "写真を削除しました"
    redirect_to child_photos_path(@child)
  end
  
  private
  
  def set_child
    @child = Child.find(params[:child_id])
  end
  
  def correct_parent
    unless current_user == @child.user
      flash[:danger] = "アクセス権限がありません"
      redirect_to parent_dashboard_path
    end
  end
end
