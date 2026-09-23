import type { FC } from "hono/jsx";
import type { PurchaseNotificationRow } from "../lib/db";
import { formatDateTime } from "./layout";

/** 購入通知1件。「ありがとう」のカードとして見せる（マイページの最新1件でも使う） */
export const ThanksCard: FC<{ notification: PurchaseNotificationRow; showReadButton?: boolean }> = ({
  notification: n,
  showReadButton,
}) => (
  <div class={n.read ? "thanks-card" : "thanks-card unread"}>
    <span class="icon" aria-hidden="true">
      💌
    </span>
    <div>
      <p>
        <strong>{n.grandparent_name}さん</strong>が「{n.item_name}」を贈ってくれました
        {!n.read && (
          <>
            {" "}
            <span class="tag tag-pending">未読</span>
          </>
        )}
      </p>
      {n.message && <p class="msg">「{n.message}」</p>}
      <p class="when">
        {n.child_name}さんのほしいもの ・ {formatDateTime(n.created_at)}
      </p>
      {showReadButton && !n.read && (
        <form action={`/purchase_notifications/${n.id}/read`} method="post">
          <button type="submit" class="btn btn-outline">
            既読にする
          </button>
        </form>
      )}
    </div>
  </div>
);

export const NotificationsPage: FC<{
  notifications: PurchaseNotificationRow[];
  filter: "all" | "unread" | "read";
}> = ({ notifications, filter }) => (
  <>
    <h1>購入通知</h1>
    <p class="page-lead">
      おじいちゃん・おばあちゃんがおくりものを買うと、ここに「ありがとう」のお知らせが届きます。
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
          <li>
            <ThanksCard notification={n} showReadButton />
          </li>
        ))}
      </ul>
    )}
  </>
);
