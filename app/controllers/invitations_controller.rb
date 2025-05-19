class InvitationsController < ApplicationController
  skip_before_action :require_login, only: [:show, :accept, :register]
  before_action :set_child, only: [:index, :new, :create]
  before_action :correct_parent, only: [:index, :new, :create, :destroy]
  before_action :set_invitation, only: [:show, :accept, :register, :destroy]
  before_action :check_invitation_validity, only: [:show, :accept, :register]
  
  def index
    @invitations = @child.invitations.order(created_at: :desc)
  end
  
  def show
    # 招待リンクの表示ページ（未ログイン状態でアクセス可能）
    @child = @invitation.child
    @parent = @invitation.parent
  end
  
  def new
    @invitation = @child.invitations.build
  end
  
  def create
    @invitation = @child.invitations.build(parent_id: current_user.id)
    
    if @invitation.save
      flash[:success] = "招待リンクを作成しました"
      redirect_to child_invitations_path(@child)
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def accept
    # 祖父母ユーザー登録フォームを表示
    @user = User.new
    @child = @invitation.child
  end
  
  def register
    # 祖父母ユーザー登録処理
    @user = User.new(user_params)
    @user.user_type = 'grandparent'
    
    if @user.save
      @invitation.accept!(@user)
      log_in @user
      flash[:success] = "登録が完了しました。#{@invitation.child.name}さんのページへようこそ！"
      redirect_to grandparent_dashboard_path
    else
      @child = @invitation.child
      render :accept, status: :unprocessable_entity
    end
  end
  
  def destroy
    child = @invitation.child
    @invitation.expire!
    flash[:success] = "招待を無効化しました"
    redirect_to child_invitations_path(child), status: :see_other
  end
  
  private
  
  def set_child
    @child = Child.find(params[:child_id])
  end
  
  def set_invitation
    @invitation = params[:id] ? Invitation.find(params[:id]) : Invitation.find_by!(token: params[:token])
  end
  
  def correct_parent
    unless current_user == @child.user
      flash[:danger] = "アクセス権限がありません"
      redirect_to parent_dashboard_path
    end
  end
  
  def check_invitation_validity
    if @invitation.expired?
      flash[:danger] = "この招待リンクは有効期限が切れているか、既に使用されています"
      redirect_to root_path
    end
  end
  
  def user_params
    params.require(:user).permit(:name, :email, :password, :password_confirmation)
  end
end
