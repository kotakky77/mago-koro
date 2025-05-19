class CreateSouvenirOrders < ActiveRecord::Migration[7.1]
  def change
    create_table :souvenir_orders do |t|
      t.integer :user_id, null: false
      t.integer :souvenir_id, null: false
      t.integer :child_id, null: false
      t.string :status, default: 'pending' # pending, processing, shipped, delivered, cancelled
      t.text :shipping_address, null: false
      t.string :recipient_name, null: false
      t.string :contact_phone

      t.timestamps
    end
    
    add_index :souvenir_orders, :user_id
    add_index :souvenir_orders, :souvenir_id
    add_index :souvenir_orders, :child_id
  end
end
