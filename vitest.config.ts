import { defineConfig } from "vitest/config";

// 純粋ロジック（PBKDF2・バリデーション・招待期限・MIME）をNode上でテストする。
// D1/R2やHonoルートの結合確認は `docker compose up`（wrangler dev）で行う。
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
  },
});
