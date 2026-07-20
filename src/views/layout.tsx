import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Child, FC } from "hono/jsx";
import type { AppEnv } from "../app-env";
import type { SessionUser } from "../lib/auth";
import { countUnreadNotifications } from "../lib/db";
import { Flash, takeFlash } from "../lib/flash";

const APP_NAME = "まごころおくりもの";

// ロール別ナビゲーション（祖父母向けは4項目以内・大きめのリンク）
const Nav: FC<{ user: SessionUser | null; unread: number; currentPath: string }> = ({
  user,
  unread,
  currentPath,
}) => {
  const link = (href: string, label: Child) => (
    <a href={href} class={currentPath === href ? "active" : ""}>
      {label}
    </a>
  );

  if (!user) {
    return (
      <nav class="site-nav">
        {link("/login", "ログイン")}
        {link("/signup", "新規登録")}
      </nav>
    );
  }

  return (
    <nav class="site-nav">
      {user.userType === "parent" && (
        <>
          {link("/parent/dashboard", "マイページ")}
          {link(
            "/purchase_notifications",
            <>
              購入通知
              {unread > 0 && <span class="nav-badge">{unread}</span>}
            </>,
          )}
        </>
      )}
      {user.userType === "grandparent" && (
        <>
          {link("/grandparent/dashboard", "マイページ")}
          {link("/grandparent/photos", "写真を見る")}
          {link("/grandparent/wishlist_items", "ほしいもの")}
          {link("/grandparent/souvenirs", "記念品")}
        </>
      )}
      {user.userType === "admin" && (
        <>
          {link("/admin/dashboard", "ダッシュボード")}
          {link("/admin/users", "ユーザー")}
          {link("/admin/souvenirs", "カタログ")}
          {link("/admin/orders", "注文")}
        </>
      )}
      <form action="/logout" method="post">
        <button type="submit" class="btn btn-outline">
          ログアウト
        </button>
      </form>
    </nav>
  );
};

const Layout: FC<{
  title: string;
  user: SessionUser | null;
  unread: number;
  currentPath: string;
  flash: Flash;
  children?: Child;
}> = ({ title, user, unread, currentPath, flash, children }) => (
  <html lang="ja">
    <head>
      <meta charset="utf-8" />
      <title>{title}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="stylesheet" href="/app.css" />
    </head>
    <body>
      <header class="site-header">
        <div class="container">
          <a href="/" class="brand">
            🎁 {APP_NAME}
          </a>
          <Nav user={user} unread={unread} currentPath={currentPath} />
        </div>
      </header>
      <main class="container">
        {flash.notice && <div class="flash flash-notice">{flash.notice}</div>}
        {flash.alert && <div class="flash flash-alert">{flash.alert}</div>}
        {children}
      </main>
      <footer class="site-footer">
        <div class="container">{APP_NAME} — 祖父母と孫をつなぐアプリ</div>
      </footer>
      <script src="/app.js" defer></script>
    </body>
  </html>
);

// レイアウトを被せてHTMLレスポンスを返す。フラッシュはここで消費される。
// 親ユーザーには未読の購入通知バッジを表示する（1クエリ）。
export async function renderPage(
  c: Context<AppEnv>,
  opts: { title?: string; user: SessionUser | null; status?: ContentfulStatusCode },
  children: Child,
): Promise<Response> {
  const flash = takeFlash(c);
  const unread =
    opts.user?.userType === "parent"
      ? await countUnreadNotifications(c.env.DB, opts.user.userId)
      : 0;
  const title = opts.title ? `${opts.title} | ${APP_NAME}` : APP_NAME;
  const body =
    "<!DOCTYPE html>" +
    (
      <Layout
        title={title}
        user={opts.user}
        unread={unread}
        currentPath={new URL(c.req.url).pathname}
        flash={flash}
      >
        {children}
      </Layout>
    ).toString();
  return c.html(body, opts.status ?? 200);
}

// バリデーションエラーの一覧表示（Railsの form-errors ブロック相当）
export const FormErrors: FC<{ errors: string[] }> = ({ errors }) =>
  errors.length === 0 ? (
    <></>
  ) : (
    <div class="form-errors">
      <ul>
        {errors.map((message) => (
          <li>{message}</li>
        ))}
      </ul>
    </div>
  );

// ---- 表示ヘルパー ----

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : `${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: iso.includes("T") ? "Asia/Tokyo" : "UTC",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(iso));
}

export function formatPrice(price: number | null): string {
  if (price === null) return "";
  return `¥${Math.round(price).toLocaleString("ja-JP")}`;
}

// 誕生日から年齢（Railsビューにあった「n歳」表示相当）
export function ageFrom(birthdate: string | null): string {
  if (!birthdate) return "";
  const b = new Date(`${birthdate}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < b.getUTCMonth() ||
    (now.getUTCMonth() === b.getUTCMonth() && now.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? `${age}歳` : "";
}
