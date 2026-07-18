// 祖父母向け機能（Rails: GrandparentsController + wishlist_items#purchase 相当）。
import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../app-env";
import { dashboardPath } from "../app-env";
import {
  ChildRow,
  findChild,
  findWishlistItem,
  grandparentHasChild,
  listGrandchildren,
  listPhotos,
  listWishlistItems,
  markAsPurchased,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import {
  GrandparentDashboard,
  GrandparentPhotosPage,
  GrandparentWishlistPage,
} from "../views/grandparent";
import { renderPage } from "../views/layout";

export const grandparentRoutes = new Hono<AppEnv>();

// Rails の require_grandparent 相当（"*" にすると先行ルートに影響しないが、
// 明示的に祖父母パスへ限定しておく。purchase はハンドラ内で判定）
grandparentRoutes.use("/grandparent/*", async (c, next) => {
  if (c.var.user.userType !== "grandparent") {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect(dashboardPath(c.var.user.userType));
  }
  await next();
});

grandparentRoutes.get("/grandparent/dashboard", async (c) => {
  const grandchildren = await listGrandchildren(c.env.DB, c.var.user.userId);
  return renderPage(
    c,
    { title: "マイページ", user: c.var.user },
    <GrandparentDashboard userName={c.var.user.name} grandchildren={grandchildren} />,
  );
});

// ?child_id= で選択された孫を返す。未指定なら最初の孫。権限がなければ "denied"
async function selectChild(
  c: Context<AppEnv>,
  grandchildren: ChildRow[],
): Promise<ChildRow | null | "denied"> {
  const childIdRaw = c.req.query("child_id");
  if (!childIdRaw) return grandchildren[0] ?? null;
  const child = grandchildren.find((ch) => ch.id === Number(childIdRaw));
  return child ?? "denied";
}

grandparentRoutes.get("/grandparent/photos", async (c) => {
  const grandchildren = await listGrandchildren(c.env.DB, c.var.user.userId);
  const child = await selectChild(c, grandchildren);
  if (child === "denied") {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect("/grandparent/dashboard");
  }
  const photos = child ? await listPhotos(c.env.DB, child.id) : [];
  return renderPage(
    c,
    { title: "写真を見る", user: c.var.user },
    <GrandparentPhotosPage children_={grandchildren} child={child} photos={photos} />,
  );
});

grandparentRoutes.get("/grandparent/wishlist_items", async (c) => {
  const grandchildren = await listGrandchildren(c.env.DB, c.var.user.userId);
  const child = await selectChild(c, grandchildren);
  if (child === "denied") {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect("/grandparent/dashboard");
  }
  const items = child ? await listWishlistItems(c.env.DB, child.id) : [];
  return renderPage(
    c,
    { title: "ほしいものを見る", user: c.var.user },
    <GrandparentWishlistPage children_={grandchildren} child={child} items={items} />,
  );
});

// 購入報告（Rails: wishlist_items#purchase + mark_as_purchased）
grandparentRoutes.post("/wishlist_items/:id/purchase", async (c) => {
  if (c.var.user.userType !== "grandparent") {
    setFlash(c, { alert: "この操作はできません" });
    return c.redirect(dashboardPath(c.var.user.userType));
  }
  const item = await findWishlistItem(c.env.DB, Number(c.req.param("id")));
  if (!item || !(await grandparentHasChild(c.env.DB, c.var.user.userId, item.child_id))) {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect("/grandparent/dashboard");
  }
  const backTo = `/grandparent/wishlist_items?child_id=${item.child_id}`;
  if (item.purchased) {
    setFlash(c, { alert: "この商品は既に購入済みです" });
    return c.redirect(backTo);
  }

  const child = await findChild(c.env.DB, item.child_id);
  if (!child) return c.redirect("/grandparent/dashboard");

  const form = await c.req.parseBody();
  const messageRaw = typeof form["message"] === "string" ? form["message"].trim() : "";
  await markAsPurchased(
    c.env.DB,
    item,
    child.user_id,
    c.var.user.userId,
    messageRaw === "" ? null : messageRaw,
  );

  setFlash(c, { notice: "購入操作を完了しました。親御さんに通知が送られました。" });
  return c.redirect(backTo);
});
