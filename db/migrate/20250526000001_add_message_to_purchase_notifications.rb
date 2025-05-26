class AddMessageToPurchaseNotifications < ActiveRecord::Migration[7.1]
  def change
    add_column :purchase_notifications, :message, :text, comment: "祖父母からのメッセージ"
  end
end