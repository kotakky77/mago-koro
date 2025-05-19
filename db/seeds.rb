# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# 管理者ユーザー作成
admin = User.create!(
  name: "管理者",
  email: "admin@example.com",
  password: "password",
  password_confirmation: "password",
  user_type: "admin"
)

# 親ユーザー作成
parent = User.create!(
  name: "山田太郎",
  email: "parent@example.com",
  password: "password",
  password_confirmation: "password",
  user_type: "parent"
)

# 子供（孫）作成
child = parent.children.create!(
  name: "山田花子",
  birthdate: 3.years.ago
)

# 祖父母ユーザー作成
grandparent = User.create!(
  name: "山田義男",
  email: "grandparent@example.com",
  password: "password",
  password_confirmation: "password",
  user_type: "grandparent"
)

# 招待作成と承諾
invitation = child.invitations.create!(
  parent_id: parent.id,
  expires_at: 7.days.from_now,
  status: "accepted",
  grandparent_id: grandparent.id
)

# ほしいものリストアイテム作成
wishlist_items = [
  {
    name: "アンパンマン おおきなよくばりボックス",
    url: "https://example.com/item1",
    price: 3300,
    description: "アンパンマンのおもちゃです。形合わせや音が出るボタンなど、遊び方がたくさんあります。",
    category: "おもちゃ",
    quantity: 1
  },
  {
    name: "ファーストシューズ",
    url: "https://example.com/item2",
    price: 4200,
    description: "はじめての靴です。サイズは14cmです。",
    category: "衣類",
    quantity: 1,
    purchased: true,
    purchased_by_id: grandparent.id,
    purchased_at: 2.days.ago
  },
  {
    name: "絵本「いないいないばあ」",
    url: "https://example.com/item3",
    price: 880,
    description: "人気の絵本です。寝る前に読んであげたいです。",
    category: "本",
    quantity: 1
  }
]

wishlist_items.each do |item_data|
  child.wishlist_items.create!(item_data)
end

# 購入通知作成
notification = parent.purchase_notifications.create!(
  wishlist_item_id: child.wishlist_items.where(purchased: true).first.id,
  grandparent_id: grandparent.id
)

# 記念品作成
souvenirs = [
  {
    name: "子供の絵付きマグカップ",
    description: "お子様の描いた絵をマグカップにプリントします。おじいちゃん、おばあちゃんへの贈り物に最適です。",
    price: 2500,
    active: true,
    image_path: "/images/souvenirs/mug.jpg"
  },
  {
    name: "子供の絵付きTシャツ",
    description: "お子様の描いた絵をTシャツにプリントします。サイズはS、M、Lからお選びいただけます。",
    price: 3500,
    active: true,
    image_path: "/images/souvenirs/tshirt.jpg"
  },
  {
    name: "子供の絵付きカレンダー",
    description: "お子様の描いた絵を使ったオリジナルカレンダーです。毎月違う絵を使用することもできます。",
    price: 2000,
    active: true,
    image_path: "/images/souvenirs/calendar.jpg"
  }
]

souvenirs.each do |souvenir_data|
  Souvenir.create!(souvenir_data)
end

# 記念品注文作成
order = SouvenirOrder.create!(
  user_id: grandparent.id,
  souvenir_id: Souvenir.first.id,
  child_id: child.id,
  status: "pending",
  shipping_address: "東京都渋谷区○○1-2-3",
  recipient_name: "山田義男",
  contact_phone: "090-1234-5678"
)

puts "まごころおくりものサンプルデータの作成が完了しました"
