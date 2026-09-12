-- フェーズ3: 「これを贈ります」の事前表明。
-- 既存の購入報告（purchased / purchased_by_id / purchased_at）は買った「後」しか表せず、
-- 贈る側が2組以上いると買う前に被る。買う「前」におさえられるよう列を足す。
--
-- status列に作り替える案もあったが、db.ts と views の既存箇所を広く書き換えることになるので
-- 列の追加にとどめた（docs/requirements-phase3.md §5.1）。
-- 購入報告が入ったら表示は購入済みを優先し、reserved_* は履歴として残す。

ALTER TABLE wishlist_items ADD COLUMN reserved_by_id INTEGER REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE wishlist_items ADD COLUMN reserved_at TEXT;
