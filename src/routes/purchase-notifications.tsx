// 親向け: 購入通知の一覧・既読化（Rails: PurchaseNotificationsController 相当）。
import { Hono } from "hono";
import type { AppEnv } from "../app-env";
import { findNotification, listNotifications, markNotificationRead } from "../lib/db";
import { setFlash } from "../lib/flash";
import { deniedRedirect, requireParent } from "./children";
import { renderPage } from "../views/layout";
import { NotificationsPage } from "../views/notifications";

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use("/purchase_notifications", requireParent());
notificationRoutes.use("/purchase_notifications/*", requireParent());

notificationRoutes.get("/purchase_notifications", async (c) => {
  const filterRaw = c.req.query("filter");
  const filter = filterRaw === "unread" || filterRaw === "read" ? filterRaw : "all";
  const notifications = await listNotifications(c.env.DB, c.var.user.userId, filter);
  return renderPage(
    c,
    { title: "購入通知", user: c.var.user },
    <NotificationsPage notifications={notifications} filter={filter} />,
  );
});

notificationRoutes.post("/purchase_notifications/:id/read", async (c) => {
  const notification = await findNotification(c.env.DB, Number(c.req.param("id")));
  if (!notification || notification.user_id !== c.var.user.userId) return deniedRedirect(c);
  await markNotificationRead(c.env.DB, notification.id);
  setFlash(c, { notice: "既読にしました" });
  return c.redirect("/purchase_notifications");
});
