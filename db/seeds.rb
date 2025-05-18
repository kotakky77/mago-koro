# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

# サンプルユーザーの作成
User.create!([
  {
    name: "管理者",
    email: "admin@example.com",
    password: "password",
    password_confirmation: "password"
  },
  {
    name: "テストユーザー1",
    email: "user1@example.com",
    password: "password",
    password_confirmation: "password"
  },
  {
    name: "テストユーザー2",
    email: "user2@example.com",
    password: "password",
    password_confirmation: "password"
  },
  {
    name: "テストユーザー3",
    email: "user3@example.com",
    password: "password",
    password_confirmation: "password"
  }
])

# サンプルカードの作成
Card.create!([
  {
    name: "小麦畑",
    card_type: "establishment",
    cost: 1,
    effect: "自分の手番で1が出た場合、1コインを得る"
  },
  {
    name: "牧場",
    card_type: "establishment",
    cost: 1,
    effect: "自分の手番で2が出た場合、1コインを得る"
  },
  {
    name: "パン屋",
    card_type: "establishment",
    cost: 1,
    effect: "自分の手番で2-3が出た場合、1コインを得る"
  },
  {
    name: "カフェ",
    card_type: "establishment",
    cost: 2,
    effect: "他人の手番で3が出た場合、その人から1コインをもらう"
  },
  {
    name: "コンビニ",
    card_type: "establishment",
    cost: 2,
    effect: "自分の手番で4が出た場合、3コインを得る"
  },
  {
    name: "森",
    card_type: "establishment",
    cost: 3,
    effect: "自分の手番で5が出た場合、1コインを得る"
  },
  {
    name: "スタジアム",
    card_type: "establishment",
    cost: 6,
    effect: "自分の手番で6が出た場合、全プレイヤーから2コインをもらう"
  },
  {
    name: "テレビ局",
    card_type: "establishment",
    cost: 7,
    effect: "自分の手番で6が出た場合、任意のプレイヤーから5コインをもらう"
  },
  {
    name: "駅",
    card_type: "landmark",
    cost: 4,
    effect: "1回の手番でサイコロを2個まで振れる"
  },
  {
    name: "ショッピングモール",
    card_type: "landmark",
    cost: 10,
    effect: "カフェとパン屋の効果で1コイン増加"
  },
  {
    name: "遊園地",
    card_type: "landmark",
    cost: 16,
    effect: "サイコロの目がゾロ目の場合、もう一度手番"
  },
  {
    name: "電波塔",
    card_type: "landmark",
    cost: 22,
    effect: "自分の手番ではサイコロの目を1つ選んで変更できる"
  }
])

# サンプルゲームの作成
game1 = Game.create!(
  title: "テストゲーム1",
  status: "waiting",
  max_players: 4
)

game2 = Game.create!(
  title: "テストゲーム2",
  status: "in_progress",
  max_players: 3
)

game3 = Game.create!(
  title: "テストゲーム3",
  status: "completed",
  max_players: 2
)

# サンプルゲームプレイヤーの作成
GamePlayer.create!([
  {
    game: game1,
    user: User.find_by(email: "admin@example.com"),
    points: 0
  },
  {
    game: game2,
    user: User.find_by(email: "admin@example.com"),
    points: 10
  },
  {
    game: game2,
    user: User.find_by(email: "user1@example.com"),
    points: 8
  },
  {
    game: game2,
    user: User.find_by(email: "user2@example.com"),
    points: 12
  },
  {
    game: game3,
    user: User.find_by(email: "user1@example.com"),
    points: 20
  },
  {
    game: game3,
    user: User.find_by(email: "user3@example.com"),
    points: 18
  }
])

puts "サンプルデータの作成が完了しました"
