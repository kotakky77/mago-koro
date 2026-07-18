# Rails版アーカイブ

このディレクトリは、Cloudflare Workers 版への書き直し（2026-07-18）以前に使っていた
**Ruby on Rails 7.1 + MySQL + Active Storage 版の全ファイル**をそのまま保存したもの。

- 現行版はリポジトリルートの Workers + Hono + D1 + R2 構成（`src/`, `migrations/`, `wrangler.jsonc`）
- 移行の経緯・対応関係は ルートの `NOTES.md` を参照
- Rails 版は本番稼働していなかったため、データ移行は行っていない
- 動かしたい場合はこのディレクトリで `docker compose up --build`（旧 `docker-compose.yml`）
  だが、今後メンテナンスはしない

## 当時の構成

- Ruby on Rails 7.1.2 / Ruby 3.4.2 / MySQL 8.0 / Hotwire / Active Storage / bcrypt
- 未実装のまま残った機能: おみやげ注文（souvenirs / souvenir_orders）・管理者画面は
  Workers 版ではフェーズ2として未移植（このアーカイブにのみ実装がある）
