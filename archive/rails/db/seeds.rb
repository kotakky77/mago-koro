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
child1 = parent.children.create!(
  name: "山田花子",
  birthdate: 3.years.ago
)

child2 = parent.children.create!(
  name: "山田太一",
  birthdate: 5.years.ago
)

# 祖父母ユーザー作成
grandparent = User.create!(
  name: "山田義男",
  email: "grandparent@example.com",
  password: "password",
  password_confirmation: "password",
  user_type: "grandparent"
)

# 招待作成と承諾（子供1）
invitation1 = child1.invitations.create!(
  parent_id: parent.id,
  expires_at: 7.days.from_now,
  status: "accepted",
  grandparent_id: grandparent.id
)

# 招待作成と承諾（子供2）
invitation2 = child2.invitations.create!(
  parent_id: parent.id,
  expires_at: 7.days.from_now,
  status: "accepted",
  grandparent_id: grandparent.id
)

# ほしいものリストアイテム作成（子供1：山田花子）
wishlist_items_child1 = [
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

wishlist_items_child1.each do |item_data|
  child1.wishlist_items.create!(item_data)
end

# ほしいものリストアイテム作成（子供2：山田太一）
wishlist_items_child2 = [
  {
    name: "レゴ クラシック 基本セット",
    url: "https://example.com/item4",
    price: 5800,
    description: "創造力を育むレゴブロックの基本セットです。色々な形を作って遊べます。",
    category: "おもちゃ",
    quantity: 1
  },
  {
    name: "スニーカー（17cm）",
    url: "https://example.com/item5",
    price: 3500,
    description: "運動用のスニーカーです。サイズは17cmです。",
    category: "衣類",
    quantity: 1
  },
  {
    name: "図鑑「恐竜のひみつ」",
    url: "https://example.com/item6",
    price: 1200,
    description: "恐竜好きの子供におすすめの図鑑です。写真がたくさん載っています。",
    category: "本",
    quantity: 1,
    purchased: true,
    purchased_by_id: grandparent.id,
    purchased_at: 1.day.ago
  }
]

wishlist_items_child2.each do |item_data|
  child2.wishlist_items.create!(item_data)
end

# 購入通知作成（子供1の購入済みアイテム）
notification1 = parent.purchase_notifications.create!(
  wishlist_item_id: child1.wishlist_items.where(purchased: true).first.id,
  grandparent_id: grandparent.id
)

# 購入通知作成（子供2の購入済みアイテム）
notification2 = parent.purchase_notifications.create!(
  wishlist_item_id: child2.wishlist_items.where(purchased: true).first.id,
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

# 記念品注文作成（子供1の記念品）
order1 = SouvenirOrder.create!(
  user_id: grandparent.id,
  souvenir_id: Souvenir.first.id,
  child_id: child1.id,
  status: "pending",
  shipping_address: "東京都渋谷区○○1-2-3",
  recipient_name: "山田義男",
  contact_phone: "090-1234-5678"
)

# 記念品注文作成（子供2の記念品）
order2 = SouvenirOrder.create!(
  user_id: grandparent.id,
  souvenir_id: Souvenir.second.id,
  child_id: child2.id,
  status: "delivered",
  shipping_address: "東京都渋谷区○○1-2-3",
  recipient_name: "山田義男",
  contact_phone: "090-1234-5678"
)

puts "まごころおくりものサンプルデータの作成が完了しました"
