class CreateChildren < ActiveRecord::Migration[7.1]
  def change
    create_table :children do |t|
      t.string :name, null: false
      t.date :birthdate
      t.references :user, null: false, foreign_key: true, comment: "親ユーザーへの参照"

      t.timestamps
    end
  end
end
