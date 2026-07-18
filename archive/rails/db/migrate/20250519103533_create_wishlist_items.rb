class CreateWishlistItems < ActiveRecord::Migration[7.1]
  def change
    create_table :wishlist_items do |t|
      t.string :name, null: false
      t.string :url, null: false
      t.decimal :price, precision: 10, scale: 2
      t.text :description
      t.string :category
      t.integer :quantity, default: 1
      t.boolean :purchased, default: false
      t.integer :purchased_by_id, comment: "購入操作を行った祖父母ユーザーへの参照"
      t.datetime :purchased_at
      t.integer :child_id, null: false, index: true

      t.timestamps
    end
  end
end
