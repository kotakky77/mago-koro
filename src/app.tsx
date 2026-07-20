import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { csrf } from "hono/csrf";
import appCss from "./app.css";
import appJs from "./client.js";
import faviconSvg from "./assets/favicon.svg";
import type { AppEnv } from "./app-env";
import { RETURN_TO_COOKIE, SESSION_COOKIE } from "./app-env";
import { findSessionUser } from "./lib/auth";
import { adminRoutes } from "./routes/admin";
import { childrenRoutes } from "./routes/children";
import { grandparentRoutes } from "./routes/grandparents";
import { souvenirRoutes } from "./routes/souvenirs";
import { inviteManageRoutes, invitePublicRoutes } from "./routes/invitations";
import { notificationRoutes } from "./routes/purchase-notifications";
import { photoRoutes } from "./routes/photos";
import { sessionRoutes } from "./routes/sessions";
import { wishlistRoutes } from "./routes/wishlist-items";

export const app = new Hono<AppEnv>();

// CSRF対策（Originヘッダ検証）
app.use("*", csrf());

// ---- 認証不要のパス ----
app.get("/up", (c) => c.text("ok"));
app.get("/app.css", (c) =>
  c.body(appCss, 200, {
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  }),
);
app.get("/app.js", (c) =>
  c.body(appJs, 200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  }),
);
// ブラウザが自動リクエストするため認証の外に置く
const ICON_CACHE = "public, max-age=86400";
app.get("/favicon.svg", (c) =>
  c.body(faviconSvg, 200, { "Content-Type": "image/svg+xml", "Cache-Control": ICON_CACHE }),
);
app.get("/favicon.ico", (c) =>
  c.body(faviconSvg, 200, { "Content-Type": "image/svg+xml", "Cache-Control": ICON_CACHE }),
);

// トップ・ログイン・サインアップ・パスワードリセット
app.route("/", sessionRoutes);
// 招待の受諾・祖父母登録（招待リンクは未ログインで開かれる）
app.route("/", invitePublicRoutes);

// ---- これ以降はログイン必須（Rails の require_login 相当） ----
app.use("*", async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE) ?? "";
  const user = await findSessionUser(c.env.DB, token);
  if (!user) {
    // ログイン後に元のページへ戻れるよう記録しておく（GETのみ）
    if (c.req.method === "GET") {
      const url = new URL(c.req.url);
      setCookie(c, RETURN_TO_COOKIE, url.pathname + url.search, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        maxAge: 10 * 60,
      });
    }
    return c.redirect("/login");
  }
  c.set("user", user);
  return next();
});

// 写真配信は親・祖父母の両方が使うため、ロール別ルートより先に登録する
app.route("/", photoRoutes);
// 親向け
app.route("/", childrenRoutes);
app.route("/", wishlistRoutes);
app.route("/", inviteManageRoutes);
app.route("/", notificationRoutes);
// 祖父母向け（/wishlist_items/:id/purchase を含む）
app.route("/", grandparentRoutes);
// 記念品: 祖父母のカタログ・注文 + 商品画像配信（画像は全ロール共通）
app.route("/", souvenirRoutes);
// 管理者向け
app.route("/", adminRoutes);
