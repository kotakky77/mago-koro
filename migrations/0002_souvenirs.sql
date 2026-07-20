-- フェーズ2: 記念品（おみやげ）カタログと注文。
-- archive/rails/db/migrate/20250519103608_create_souvenirs.rb /
-- 20250519103623_create_souvenir_orders.rb の移植。
-- 変更点:
--   * price は decimal → INTEGER（円は整数で十分）
--   * image_path（実体管理が曖昧な文字列）→ image_r2_key（実体は R2）
--   * souvenirs は注文履歴を守るため ON DELETE CASCADE にしない
--     （削除は注文0件のときのみアプリ側で許可。通常は active=0 で無効化運用）

CREATE TABLE souvenirs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- 円
  active INTEGER NOT NULL DEFAULT 1,
  image_r2_key TEXT UNIQUE,
  image_content_type TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE souvenir_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 注文した祖父母
  souvenir_id INTEGER NOT NULL REFERENCES souvenirs (id),
  child_id INTEGER NOT NULL REFERENCES children (id) ON DELETE CASCADE, -- イラスト元の孫
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  contact_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_souvenir_orders_on_user_id ON souvenir_orders (user_id);
CREATE INDEX index_souvenir_orders_on_souvenir_id ON souvenir_orders (souvenir_id);
CREATE INDEX index_souvenir_orders_on_child_id ON souvenir_orders (child_id);
CREATE INDEX index_souvenir_orders_on_status ON souvenir_orders (status);
