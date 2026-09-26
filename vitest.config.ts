import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

// 純粋ロジック（PBKDF2・バリデーション・招待期限・MIME）をNode上でテストする。
// D1/R2やHonoルートの結合確認は `docker compose up`（wrangler dev）で行う。
export default defineConfig({
  plugins: [
    // wrangler.jsonc の rules（CSS/SVG/client.js を文字列として import）と同じ扱いにする。
    // レイアウトが asset-version.ts 経由で app.css / client.js を読むため、これが無いと
    // client.js がNode上で実行されて document が無いと落ちる
    {
      name: "text-import-like-wrangler",
      enforce: "pre",
      load(id) {
        const path = id.split("?")[0]!;
        if (/\.(css|svg)$/.test(path) || path.endsWith("/client.js")) {
          return `export default ${JSON.stringify(readFileSync(path, "utf8"))};`;
        }
        return null;
      },
    },
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
