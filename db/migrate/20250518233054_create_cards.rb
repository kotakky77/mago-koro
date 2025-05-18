class CreateCards < ActiveRecord::Migration[7.1]
  def change
    create_table :cards do |t|
      t.string :name
      t.string :card_type
      t.integer :cost
      t.text :effect

      t.timestamps
    end
  end
end
