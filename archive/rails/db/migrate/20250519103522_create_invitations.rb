class CreateInvitations < ActiveRecord::Migration[7.1]
  def change
    create_table :invitations do |t|
      t.string :token, null: false
      t.string :status, null: false, default: 'pending' # pending, accepted, expired
      t.datetime :expires_at, null: false
      t.integer :parent_id, null: false, comment: "招待を作成した親ユーザーへの参照"
      t.integer :child_id, null: false, comment: "招待対象の子供への参照"
      t.integer :grandparent_id, comment: "招待を受け入れた祖父母ユーザーへの参照"

      t.timestamps
    end
    
    add_index :invitations, :token, unique: true
    add_index :invitations, :parent_id
    add_index :invitations, :child_id
    add_index :invitations, :grandparent_id
  end
end
