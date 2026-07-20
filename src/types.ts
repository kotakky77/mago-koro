export type Env = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  // wrangler secret put で設定（ローカルは .dev.vars）
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  // wrangler.jsonc の vars
  GMAIL_FROM: string;
};
