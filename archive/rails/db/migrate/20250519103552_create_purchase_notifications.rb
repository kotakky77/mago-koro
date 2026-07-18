class CreatePurchaseNotifications < ActiveRecord::Migration[7.1]
  def change
    create_table :purchase_notifications do |t|
      t.integer :user_id, null: false, comment: "通知を受け取る親ユーザーへの参照"
      t.integer :wishlist_item_id, null: false
      t.integer :grandparent_id, null: false, comment: "購入操作を行った祖父母ユーザーへの参照"
      t.boolean :read, default: false

      t.timestamps
    end
    
    add_index :purchase_notifications, :user_id
    add_index :purchase_notifications, :wishlist_item_id
  end
end
