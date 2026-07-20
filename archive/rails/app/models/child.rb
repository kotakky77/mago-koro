class Child < ApplicationRecord
  belongs_to :user # 親ユーザーへの参照
  
  has_many :wishlist_items, dependent: :destroy
  has_many :invitations, dependent: :destroy
  has_many :accepted_invitations, -> { accepted }, class_name: 'Invitation'
  has_many :grandparents, through: :accepted_invitations, source: :grandparent
  has_many :souvenir_orders, dependent: :destroy
  
  has_many_attached :photos
  
  validates :name, presence: true
  
  # 写真サイズの検証（10MB以下）
  def validate_photo_size
    return unless photos.attached?
    
    photos.each do |photo|
      if photo.blob.byte_size > 10.megabytes
        errors.add(:photos, "画像サイズは10MB以下にしてください")
        photo.purge # 大きすぎる写真を削除
      end
    end
  end
  
  # 写真形式の検証（JPEG, PNG）
  def validate_photo_format
    return unless photos.attached?
    
    photos.each do |photo|
      unless photo.blob.content_type.in?(%w(image/jpeg image/png))
        errors.add(:photos, "JPEG、PNG形式のみ対応しています")
        photo.purge # 対応していない形式の写真を削除
      end
    end
  end
end
