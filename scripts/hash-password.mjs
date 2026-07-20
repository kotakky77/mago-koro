// 管理者アカウント投入用のパスワードダイジェスト生成。
// src/lib/auth.ts の hashPassword と同一形式（pbkdf2-sha256$100000$<salt>$<hash>）を出力する。
//
// 使い方:
//   docker compose run --rm dev node scripts/hash-password.mjs '<パスワード>'
const password = process.argv[2];
if (!password) {
  console.error("使い方: node scripts/hash-password.mjs <パスワード>");
  process.exit(1);
}

const ITERATIONS = 100_000;
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");

const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(password),
  "PBKDF2",
  false,
  ["deriveBits"],
);
const bits = await crypto.subtle.deriveBits(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
  key,
  256,
);
console.log(`pbkdf2-sha256$${ITERATIONS}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`);
