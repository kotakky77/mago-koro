import type { FC } from "hono/jsx";
import type { PurchaseNotificationRow } from "../lib/db";
import { formatDateTime } from "./layout";

export const NotificationsPage: FC<{
  notifications: PurchaseNotificationRow[];
  filter: "all" | "unread" | "read";
}> = ({ notifications, filter }) => (
  <>
    <h1>購入通知</h1>
    <p class="page-lead">
      おじいちゃん・おばあちゃんがほしいものを購入すると、ここにお知らせが届きます。
    </p>

    <nav class="site-nav" style="margin-bottom:16px" aria-label="通知の絞り込み">
      <a href="/purchase_notifications" class={filter === "all" ? "active" : ""}>
        すべて
      </a>
      <a href="/purchase_notifications?filter=unread" class={filter === "unread" ? "active" : ""}>
        未読
      </a>
      <a href="/purchase_notifications?filter=read" class={filter === "read" ? "active" : ""}>
        既読
      </a>
    </nav>

    {notifications.length === 0 ? (
      <div class="card">
        <p class="card-sub">通知はありません。</p>
      </div>
    ) : (
      <ul class="item-list">
        {notifications.map((n) => (
          <li class={n.read ? "card" : "card notification-unread"}>
            <div class="item-head">
              <h3>
                {n.grandparent_name}さんが「{n.item_name}」を購入しました
              </h3>
              {!n.read && <span class="tag tag-pending">未読</span>}
            </div>
            <p class="item-meta">
              {n.child_name}さんのほしいもの ・ {formatDateTime(n.created_at)}
            </p>
            {n.message && <p>💌 {n.message}</p>}
            {!n.read && (
              <form action={`/purchase_notifications/${n.id}/read`} method="post">
                <button type="submit" class="btn btn-outline">
                  既読にする
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    )}
  </>
);
