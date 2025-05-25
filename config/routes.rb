Rails.application.routes.draw do
  root 'static_pages#home'
  
  # 認証関連
  get    '/login',   to: 'sessions#new'
  post   '/login',   to: 'sessions#create'
  delete '/logout',  to: 'sessions#destroy'
  
  # ユーザー登録
  resources :users
  
  # 親向け機能
  get '/parent/dashboard', to: 'parents#dashboard'
  get '/parent/invitations', to: 'parents#invitations'
  
  # 子供管理
  resources :children do
    resources :photos, only: [:index, :create, :destroy], controller: 'children/photos'
    resources :wishlist_items
    resources :invitations, only: [:index, :new, :create, :destroy]
  end
  
  # ほしいものリスト管理
  resources :wishlist_items, only: [:index, :show]
  
  # 写真管理
  resources :photos, only: [:index, :create, :destroy]
  
  # 招待関連
  resources :invitations, only: [:show] do
    member do
      get :accept
      post :register
    end
  end
  
  # 購入通知
  resources :purchase_notifications, only: [:index, :show, :update]
  
  # 祖父母向け機能
  get '/grandparent/dashboard', to: 'grandparents#dashboard'
  get '/grandparent/photos', to: 'grandparents#photos'
  get '/grandparent/wishlist_items', to: 'grandparents#wishlist_items'
  get '/grandparent/souvenirs', to: 'grandparents#souvenirs'
  
  # 記念品・注文関連
  resources :souvenirs, only: [:index, :show] do
    resources :souvenir_orders, only: [:new, :create]
  end
  resources :souvenir_orders, only: [:index, :show]
  
  # 管理者向け機能
  namespace :admin do
    get '/dashboard', to: 'admins#dashboard'
    resources :users
    resources :souvenirs
    resources :souvenir_orders do
      member do
        patch :process_order
        patch :ship
        patch :deliver
        patch :cancel
      end
    end
  end
  
  # パスワードリセット
  resources :password_resets, only: [:new, :create, :edit, :update]

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check
end
