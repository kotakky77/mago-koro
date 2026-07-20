// 認証まわり。Rails の has_secure_password (bcrypt) + セッションCookieの代替。
// birthday-reminder の auth.ts を3ロール（parent/grandparent/admin）対応に拡張したもの。
//
// - パスワード: WebCrypto PBKDF2-SHA256 100,000回。bcrypt は Workers 無料枠の
//   CPU 時間制限に収まらないため使わない。
// - セッション: ランダム256bitトークンを sessions.token に保存して照合する。
// - パスワードリセットトークン: 256bitランダム値の SHA-256 を reset_digest に保存
//   （高エントロピーなのでストレッチング不要）。

export const PBKDF2_ITERATIONS = 100_000;
export const PASSWORD_MIN_LENGTH = 6; // Rails: validates :password, length: { minimum: 6 }

const encoder = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

// 形式: pbkdf2-sha256$100000$<salt b64url>$<hash b64url>
export async function hashPassword(
  password: string,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${b64url(salt)}$${b64url(hash)}`;
}

export async function verifyPassword(password: string, digest: string): Promise<boolean> {
  const parts = digest.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 5_000_000) return false;
  const salt = fromB64url(parts[2]!);
  const expected = fromB64url(parts[3]!);
  if (!salt || !expected) return false;
  const actual = await pbkdf2(password, salt, iterations);
  return timingSafeEqualBytes(actual, expected);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Rails の /\A[\w+\-.]+@[a-z\d\-.]+\.[a-z]+\z/i 相当
export function validEmailFormat(email: string): boolean {
  return /^[\w+\-.]+@[a-z\d\-.]+\.[a-z]+$/i.test(email);
}

// ランダムトークン（セッション・招待・リセット共用）。128bit以上。
export function generateToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

// リセット/招待トークンの保存用ダイジェスト（SHA-256 hex）
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- D1 を使うセッション・ユーザー操作 ----

export type UserType = "parent" | "grandparent" | "admin";

export type SessionUser = {
  userId: number;
  name: string;
  email: string;
  userType: UserType;
};

// パスワード不一致でもユーザー不在でも所要時間が変わらないよう、
// 不在時はダミーダイジェストに対して検証する。
const DUMMY_DIGEST_PROMISE: { current: Promise<string> | null } = { current: null };

export async function authenticateUser(
  db: D1Database,
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await db
    .prepare(
      "SELECT id, name, email, user_type, password_digest FROM users WHERE lower(email) = ?",
    )
    .bind(normalizeEmail(email))
    .first<{
      id: number;
      name: string;
      email: string;
      user_type: UserType;
      password_digest: string;
    }>();
  if (!user) {
    DUMMY_DIGEST_PROMISE.current ??= hashPassword("dummy-password-for-timing");
    await verifyPassword(password, await DUMMY_DIGEST_PROMISE.current);
    return null;
  }
  if (!(await verifyPassword(password, user.password_digest))) return null;
  return { userId: user.id, name: user.name, email: user.email, userType: user.user_type };
}

export async function createSession(
  db: D1Database,
  userId: number,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<string> {
  const token = generateToken();
  await db
    .prepare("INSERT INTO sessions (user_id, token, ip_address, user_agent) VALUES (?, ?, ?, ?)")
    .bind(userId, token, ipAddress, userAgent)
    .run();
  return token;
}

export async function findSessionUser(
  db: D1Database,
  token: string,
): Promise<SessionUser | null> {
  if (!token) return null;
  const row = await db
    .prepare(
      `SELECT u.id AS user_id, u.name, u.email, u.user_type
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .bind(token)
    .first<{ user_id: number; name: string; email: string; user_type: UserType }>();
  return row
    ? { userId: row.user_id, name: row.name, email: row.email, userType: row.user_type }
    : null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

// ---- ユーザー登録（Rails の User バリデーション相当） ----

export type NewUserInput = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export function validateNewUser(input: NewUserInput): string[] {
  const errors: string[] = [];
  if (input.name.trim() === "") errors.push("名前を入力してください");
  if (input.name.length > 50) errors.push("名前は50文字以内で入力してください");
  if (input.email.trim() === "") {
    errors.push("メールアドレスを入力してください");
  } else if (input.email.length > 255 || !validEmailFormat(input.email.trim())) {
    errors.push("メールアドレスの形式が正しくありません");
  }
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`);
  }
  if (input.password !== input.passwordConfirmation) {
    errors.push("パスワード（確認）が一致しません");
  }
  return errors;
}

// 登録。メール重複時は null を返す（呼び出し側でエラー表示）。
export async function createUser(
  db: D1Database,
  input: { name: string; email: string; password: string; userType: UserType },
): Promise<SessionUser | null> {
  const email = normalizeEmail(input.email);
  const digest = await hashPassword(input.password);
  try {
    const result = await db
      .prepare(
        "INSERT INTO users (name, email, password_digest, user_type) VALUES (?, ?, ?, ?) RETURNING id",
      )
      .bind(input.name.trim(), email, digest, input.userType)
      .first<{ id: number }>();
    if (!result) return null;
    return { userId: result.id, name: input.name.trim(), email, userType: input.userType };
  } catch (e) {
    // lower(email) の一意インデックス違反
    if (String(e).includes("UNIQUE")) return null;
    throw e;
  }
}
