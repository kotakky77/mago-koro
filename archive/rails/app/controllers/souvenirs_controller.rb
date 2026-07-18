class SouvenirsController < ApplicationController
  before_action :require_login
  before_action :set_souvenir, only: [:show]
  
  def index
    @souvenirs = Souvenir.active
  end
  
  def show
    # 祖父母の場合は孫情報も取得
    if current_user.grandparent?
      @children = current_user.grandchildren
    end
  end
  
  private
  
  def set_souvenir
    @souvenir = Souvenir.find(params[:id])
  end
end
