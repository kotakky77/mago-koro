-- Rails版 db/schema.rb をSQLite方言に移植したスキーマ（コア機能のみ）。
-- 変更点:
--   * Active Storage 3テーブル → photos テーブル + R2（実体は R2 バケット）
--   * sessions を新設（署名Cookieの代わりにランダムトークンで照合する）
--   * dependent: :destroy は ON DELETE CASCADE で代替
--   * users.email は lower(email) に一意インデックス（Railsの case_sensitive: false 相当）
--   * ログインレート制限用の login_attempts を追加
--   * souvenirs / souvenir_orders / admin はフェーズ2（別マイグレーション）
-- 日付は TEXT 'YYYY-MM-DD'、日時は TEXT ISO8601 (UTC)。

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_digest TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('parent', 'grandparent', 'admin')),
  reset_digest TEXT,
  reset_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE UNIQUE INDEX index_users_on_lower_email ON users (lower(email));

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_sessions_on_user_id ON sessions (user_id);

CREATE TABLE children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  birthdate TEXT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 親ユーザー
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_children_on_user_id ON children (user_id);

-- Active Storage の代替。実体は R2 の r2_key に置く
CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children (id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_photos_on_child_id ON photos (child_id);

CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TEXT NOT NULL,
  parent_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id INTEGER NOT NULL REFERENCES children (id) ON DELETE CASCADE,
  grandparent_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_invitations_on_child_id ON invitations (child_id);
CREATE INDEX index_invitations_on_grandparent_id ON invitations (grandparent_id);

CREATE TABLE wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  price REAL,
  description TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  purchased INTEGER NOT NULL DEFAULT 0,
  purchased_by_id INTEGER REFERENCES users (id) ON DELETE SET NULL, -- 購入した祖父母
  purchased_at TEXT,
  child_id INTEGER NOT NULL REFERENCES children (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_wishlist_items_on_child_id ON wishlist_items (child_id);

CREATE TABLE purchase_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- 通知を受け取る親
  wishlist_item_id INTEGER NOT NULL REFERENCES wishlist_items (id) ON DELETE CASCADE,
  grandparent_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  read INTEGER NOT NULL DEFAULT 0,
  message TEXT, -- 祖父母からのメッセージ
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX index_purchase_notifications_on_user_id ON purchase_notifications (user_id);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX index_login_attempts_on_ip_attempted_at ON login_attempts (ip, attempted_at);
