// 認証まわりの公開ルート（Rails: sessions/users/password_resets コントローラー相当）。
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "../app-env";
import { RETURN_TO_COOKIE, SESSION_COOKIE, clientIp, dashboardPath } from "../app-env";
import {
  authenticateUser,
  createSession,
  createUser,
  deleteSession,
  findSessionUser,
  generateToken,
  hashPassword,
  normalizeEmail,
  sha256Hex,
  validateNewUser,
} from "../lib/auth";
import { setFlash } from "../lib/flash";
import { buildMimeMessage, getGmailAccessToken, sendGmail } from "../lib/gmail";
import { passwordResetMail } from "../lib/mail-templates";
import { loginRateLimited } from "../lib/rate-limit";
import {
  HomePage,
  LoginPage,
  PasswordResetEditPage,
  PasswordResetRequestPage,
  SignupPage,
} from "../views/auth";
import { renderPage } from "../views/layout";

export const sessionRoutes = new Hono<AppEnv>();

// ログインCookieをセットする共通処理
async function logIn(c: Parameters<typeof clientIp>[0], userId: number): Promise<void> {
  const token = await createSession(
    c.env.DB,
    userId,
    clientIp(c),
    c.req.header("User-Agent") ?? null,
  );
  setCookie(c, SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 365 * 24 * 60 * 60,
  });
}

// トップページ。ログイン済みならロール別ダッシュボードへ
sessionRoutes.get("/", async (c) => {
  const user = await findSessionUser(c.env.DB, getCookie(c, SESSION_COOKIE) ?? "");
  if (user) return c.redirect(dashboardPath(user.userType));
  return renderPage(c, { user: null }, <HomePage />);
});

sessionRoutes.get("/login", async (c) => {
  const user = await findSessionUser(c.env.DB, getCookie(c, SESSION_COOKIE) ?? "");
  if (user) return c.redirect(dashboardPath(user.userType));
  return renderPage(c, { title: "ログイン", user: null }, <LoginPage />);
});

sessionRoutes.post("/login", async (c) => {
  const ip = clientIp(c);
  if (await loginRateLimited(c.env.DB, ip)) {
    setFlash(c, { alert: "試行回数が多すぎます。しばらく待ってからお試しください" });
    return c.redirect("/login");
  }

  const form = await c.req.parseBody();
  const email = typeof form["email"] === "string" ? form["email"] : "";
  const password = typeof form["password"] === "string" ? form["password"] : "";

  const user = await authenticateUser(c.env.DB, email, password);
  if (!user) {
    setFlash(c, { alert: "メールアドレスまたはパスワードが正しくありません" });
    return c.redirect("/login");
  }

  await logIn(c, user.userId);

  const returnTo = getCookie(c, RETURN_TO_COOKIE);
  if (returnTo) deleteCookie(c, RETURN_TO_COOKIE, { path: "/" });
  return c.redirect(
    returnTo?.startsWith("/") ? returnTo : dashboardPath(user.userType),
  );
});

sessionRoutes.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await deleteSession(c.env.DB, token);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  setFlash(c, { notice: "ログアウトしました" });
  return c.redirect("/login");
});

// ---- 親ユーザーの新規登録（Rails: users#new/create） ----

sessionRoutes.get("/signup", (c) =>
  renderPage(
    c,
    { title: "新規登録", user: null },
    <SignupPage errors={[]} values={{ name: "", email: "" }} />,
  ),
);

sessionRoutes.post("/signup", async (c) => {
  const form = await c.req.parseBody();
  const input = {
    name: typeof form["name"] === "string" ? form["name"] : "",
    email: typeof form["email"] === "string" ? form["email"] : "",
    password: typeof form["password"] === "string" ? form["password"] : "",
    passwordConfirmation:
      typeof form["password_confirmation"] === "string" ? form["password_confirmation"] : "",
  };

  const errors = validateNewUser(input);
  if (errors.length === 0) {
    const user = await createUser(c.env.DB, { ...input, userType: "parent" });
    if (user) {
      await logIn(c, user.userId);
      setFlash(c, { notice: "ようこそ！まごころおくりものへ！" });
      return c.redirect("/parent/dashboard");
    }
    errors.push("このメールアドレスは既に登録されています");
  }

  return renderPage(
    c,
    { title: "新規登録", user: null, status: 422 },
    <SignupPage errors={errors} values={{ name: input.name, email: input.email }} />,
  );
});

// ---- パスワードリセット（Rails: password_resets コントローラー） ----
// トークンはメールにのみ含め、DBには SHA-256 ダイジェストを保存。有効期限2時間。

const RESET_EXPIRY_MS = 2 * 60 * 60 * 1000;

sessionRoutes.get("/password_resets/new", (c) =>
  renderPage(c, { title: "パスワード再設定", user: null }, <PasswordResetRequestPage />),
);

sessionRoutes.post("/password_resets", async (c) => {
  // メール送信もあるのでログインと同じレート制限をかける
  if (await loginRateLimited(c.env.DB, clientIp(c))) {
    setFlash(c, { alert: "試行回数が多すぎます。しばらく待ってからお試しください" });
    return c.redirect("/password_resets/new");
  }

  const form = await c.req.parseBody();
  const email = normalizeEmail(typeof form["email"] === "string" ? form["email"] : "");
  const user = await c.env.DB.prepare(
    "SELECT id, name, email FROM users WHERE lower(email) = ?",
  )
    .bind(email)
    .first<{ id: number; name: string; email: string }>();

  if (!user) {
    return renderPage(
      c,
      { title: "パスワード再設定", user: null, status: 422 },
      <PasswordResetRequestPage error="そのメールアドレスは登録されていません" />,
    );
  }

  const token = generateToken();
  await c.env.DB.prepare(
    "UPDATE users SET reset_digest = ?, reset_sent_at = ?, updated_at = ? WHERE id = ?",
  )
    .bind(await sha256Hex(token), new Date().toISOString(), new Date().toISOString(), user.id)
    .run();

  const origin = new URL(c.req.url).origin;
  const resetUrl = `${origin}/password_resets/${token}/edit?email=${encodeURIComponent(user.email)}`;
  const mail = passwordResetMail({ userName: user.name, resetUrl });
  const accessToken = await getGmailAccessToken({
    clientId: c.env.GMAIL_CLIENT_ID,
    clientSecret: c.env.GMAIL_CLIENT_SECRET,
    refreshToken: c.env.GMAIL_REFRESH_TOKEN,
  });
  await sendGmail(
    accessToken,
    buildMimeMessage({
      from: c.env.GMAIL_FROM,
      to: user.email,
      subject: mail.subject,
      body: mail.body,
    }),
  );

  setFlash(c, { notice: "パスワード再設定のメールを送信しました。メールをご確認ください。" });
  return c.redirect("/login");
});

// メールのリンクからトークンを検証してユーザーを特定する
async function findResettableUser(
  db: D1Database,
  token: string,
  email: string,
): Promise<{ id: number; expired: boolean } | null> {
  const user = await db
    .prepare(
      "SELECT id, reset_digest, reset_sent_at FROM users WHERE lower(email) = ?",
    )
    .bind(normalizeEmail(email))
    .first<{ id: number; reset_digest: string | null; reset_sent_at: string | null }>();
  if (!user || !user.reset_digest || !user.reset_sent_at) return null;
  if ((await sha256Hex(token)) !== user.reset_digest) return null;
  const expired = Date.now() - new Date(user.reset_sent_at).getTime() > RESET_EXPIRY_MS;
  return { id: user.id, expired };
}

sessionRoutes.get("/password_resets/:token/edit", async (c) => {
  const token = c.req.param("token");
  const email = c.req.query("email") ?? "";
  const user = await findResettableUser(c.env.DB, token, email);
  if (!user) return c.redirect("/");
  if (user.expired) {
    setFlash(c, { alert: "パスワード再設定の期限が切れています" });
    return c.redirect("/password_resets/new");
  }
  return renderPage(
    c,
    { title: "新しいパスワードの設定", user: null },
    <PasswordResetEditPage token={token} email={email} errors={[]} />,
  );
});

sessionRoutes.post("/password_resets/:token", async (c) => {
  const token = c.req.param("token");
  const email = c.req.query("email") ?? "";
  const user = await findResettableUser(c.env.DB, token, email);
  if (!user) return c.redirect("/");
  if (user.expired) {
    setFlash(c, { alert: "パスワード再設定の期限が切れています" });
    return c.redirect("/password_resets/new");
  }

  const form = await c.req.parseBody();
  const password = typeof form["password"] === "string" ? form["password"] : "";
  const confirmation =
    typeof form["password_confirmation"] === "string" ? form["password_confirmation"] : "";

  const errors: string[] = [];
  if (password.length < 6) errors.push("パスワードは6文字以上で入力してください");
  if (password !== confirmation) errors.push("パスワード（確認）が一致しません");
  if (errors.length > 0) {
    return renderPage(
      c,
      { title: "新しいパスワードの設定", user: null, status: 422 },
      <PasswordResetEditPage token={token} email={email} errors={errors} />,
    );
  }

  await c.env.DB.prepare(
    "UPDATE users SET password_digest = ?, reset_digest = NULL, reset_sent_at = NULL, updated_at = ? WHERE id = ?",
  )
    .bind(await hashPassword(password), new Date().toISOString(), user.id)
    .run();

  const sessionUser = await c.env.DB.prepare("SELECT user_type FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ user_type: string }>();
  await logIn(c, user.id);
  setFlash(c, { notice: "パスワードを変更しました" });
  return c.redirect(dashboardPath(sessionUser?.user_type ?? ""));
});
