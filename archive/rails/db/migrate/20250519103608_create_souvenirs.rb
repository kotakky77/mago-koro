class CreateSouvenirs < ActiveRecord::Migration[7.1]
  def change
    create_table :souvenirs do |t|
      t.string :name, null: false
      t.text :description
      t.decimal :price, precision: 10, scale: 2, null: false
      t.boolean :active, default: true
      t.string :image_path

      t.timestamps
    end
  end
end
