# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2025_05_26_000001) do
  create_table "active_storage_attachments", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "children", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.date "birthdate"
    t.bigint "user_id", null: false, comment: "親ユーザーへの参照"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_children_on_user_id"
  end

  create_table "invitations", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "token", null: false
    t.string "status", default: "pending", null: false
    t.datetime "expires_at", null: false
    t.integer "parent_id", null: false, comment: "招待を作成した親ユーザーへの参照"
    t.integer "child_id", null: false, comment: "招待対象の子供への参照"
    t.integer "grandparent_id", comment: "招待を受け入れた祖父母ユーザーへの参照"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["child_id"], name: "index_invitations_on_child_id"
    t.index ["grandparent_id"], name: "index_invitations_on_grandparent_id"
    t.index ["parent_id"], name: "index_invitations_on_parent_id"
    t.index ["token"], name: "index_invitations_on_token", unique: true
  end

  create_table "purchase_notifications", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.integer "user_id", null: false, comment: "通知を受け取る親ユーザーへの参照"
    t.integer "wishlist_item_id", null: false
    t.integer "grandparent_id", null: false, comment: "購入操作を行った祖父母ユーザーへの参照"
    t.boolean "read", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "message", comment: "祖父母からのメッセージ"
    t.index ["user_id"], name: "index_purchase_notifications_on_user_id"
    t.index ["wishlist_item_id"], name: "index_purchase_notifications_on_wishlist_item_id"
  end

  create_table "souvenir_orders", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.integer "user_id", null: false
    t.integer "souvenir_id", null: false
    t.integer "child_id", null: false
    t.string "status", default: "pending"
    t.text "shipping_address", null: false
    t.string "recipient_name", null: false
    t.string "contact_phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["child_id"], name: "index_souvenir_orders_on_child_id"
    t.index ["souvenir_id"], name: "index_souvenir_orders_on_souvenir_id"
    t.index ["user_id"], name: "index_souvenir_orders_on_user_id"
  end

  create_table "souvenirs", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.decimal "price", precision: 10, scale: 2, null: false
    t.boolean "active", default: true
    t.string "image_path"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "users", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "user_type", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "reset_digest"
    t.datetime "reset_sent_at"
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  create_table "wishlist_items", charset: "utf8mb4", collation: "utf8mb4_0900_ai_ci", force: :cascade do |t|
    t.string "name", null: false
    t.string "url", null: false
    t.decimal "price", precision: 10, scale: 2
    t.text "description"
    t.string "category"
    t.integer "quantity", default: 1
    t.boolean "purchased", default: false
    t.integer "purchased_by_id", comment: "購入操作を行った祖父母ユーザーへの参照"
    t.datetime "purchased_at"
    t.integer "child_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["child_id"], name: "index_wishlist_items_on_child_id"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "children", "users"
end
