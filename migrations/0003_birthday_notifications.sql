-- フェーズ3: 誕生日お知らせメールの送信ログ。
-- ねらいは「二重送信させないこと」の一点。
--   * Cron は失敗すると Cloudflare 側で再試行されるので、送信前にここへ INSERT して席を取る
--     （INSERT OR IGNORE の changes が 0 なら、その回はもう送信済み）
--   * 送信に失敗したら行を消して、再試行で拾い直せるようにする
-- kind は 'd14'（2週間前）/ 'd7'（1週間前）。sent_on は JST の送信日。

CREATE TABLE birthday_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL REFERENCES children (id) ON DELETE CASCADE,
  grandparent_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('d14', 'd7')),
  sent_on TEXT NOT NULL, -- JSTの送信日 'YYYY-MM-DD'
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- 二重送信防止の本体。同じ日に同じ孫・同じ祖父母・同じ種類は1通だけ
CREATE UNIQUE INDEX idx_birthday_notifications_once
  ON birthday_notifications (child_id, grandparent_id, kind, sent_on);
