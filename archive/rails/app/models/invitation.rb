class Invitation < ApplicationRecord
  belongs_to :child
  belongs_to :parent, class_name: 'User', foreign_key: 'parent_id'
  belongs_to :grandparent, class_name: 'User', foreign_key: 'grandparent_id', optional: true
  
  validates :token, presence: true, uniqueness: true
  validates :status, presence: true, inclusion: { in: %w(pending accepted expired) }
  validates :expires_at, presence: true
  
  before_validation :generate_token, on: :create
  before_validation :set_expiry_date, on: :create
  
  scope :pending, -> { where(status: 'pending') }
  scope :accepted, -> { where(status: 'accepted') }
  scope :expired, -> { where(status: 'expired') }
  scope :valid, -> { where("status = 'pending' AND expires_at > ?", Time.current) }
  
  def expired?
    expires_at < Time.current || status == 'expired'
  end
  
  def accepted?
    status == 'accepted'
  end
  
  def pending?
    status == 'pending'
  end
  
  def accept!(grandparent_user)
    update(
      grandparent_id: grandparent_user.id, 
      status: 'accepted',
      updated_at: Time.current
    )
  end
  
  def expire!
    update(status: 'expired')
  end
  
  private
  
  def generate_token
    self.token ||= SecureRandom.urlsafe_base64(16)
  end
  
  def set_expiry_date
    self.expires_at ||= 7.days.from_now
  end
end
