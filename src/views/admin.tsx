// 管理者向け画面: ダッシュボード・ユーザー管理・記念品カタログ管理・注文管理
// （docs/screen-design-mock/admin-*.html 相当。管理者は高齢者向け配慮の対象外だが
//   デザイントークン・既存クラスは共通で使う）。
import type { FC } from "hono/jsx";
import type {
  AdminDashboardCounts,
  SouvenirOrderListRow,
  SouvenirRow,
  UserListRow,
} from "../lib/db";
import { nextOrderStatuses } from "../lib/db";
import { FormErrors, formatDateTime, formatPrice } from "./layout";
import { ORDER_STATUS_LABELS, OrderStatusTag } from "./souvenirs";

const USER_TYPE_LABELS: Record<string, string> = {
  parent: "親",
  grandparent: "祖父母",
  admin: "管理者",
};

// フィルタ用のリンク列（?key=value。value 空で「すべて」）
const FilterLinks: FC<{
  basePath: string;
  paramKey: string;
  current: string;
  options: [value: string, label: string][];
}> = ({ basePath, paramKey, current, options }) => (
  <nav class="site-nav" style="margin-bottom:16px" aria-label="絞り込み">
    <a href={basePath} class={current === "" ? "active" : ""}>
      すべて
    </a>
    {options.map(([value, label]) => (
      <a href={`${basePath}?${paramKey}=${value}`} class={current === value ? "active" : ""}>
        {label}
      </a>
    ))}
  </nav>
);

export const AdminDashboard: FC<{ counts: AdminDashboardCounts }> = ({ counts }) => (
  <>
    <h1>🛠 管理者ダッシュボード</h1>
    <div class="card-grid">
      <div class="card">
        <h3>👪 ユーザー</h3>
        <p class="stat-number">{counts.parents + counts.grandparents}</p>
        <p class="card-sub">
          親 {counts.parents} 人 / 祖父母 {counts.grandparents} 人
        </p>
        <div class="card-actions">
          <a href="/admin/users" class="btn btn-secondary">ユーザー管理へ</a>
        </div>
      </div>
      <div class="card">
        <h3>👶 子ども</h3>
        <p class="stat-number">{counts.children}</p>
        <p class="card-sub">登録されている子どもの数</p>
      </div>
      <div class="card">
        <h3>🎁 記念品カタログ</h3>
        <div class="card-actions">
          <a href="/admin/souvenirs" class="btn btn-secondary">カタログ管理へ</a>
          <a href="/admin/souvenirs/new" class="btn btn-primary">記念品を登録</a>
        </div>
      </div>
      <div class="card">
        <h3>📦 注文</h3>
        <p class="stat-number">{counts.orders}</p>
        <p class="card-sub">未処理（受付済み）: {counts.pendingOrders} 件</p>
        <div class="card-actions">
          <a href="/admin/orders" class="btn btn-secondary">注文管理へ</a>
        </div>
      </div>
    </div>
  </>
);

export const AdminUsersPage: FC<{ users: UserListRow[]; filter: string }> = ({
  users,
  filter,
}) => (
  <>
    <a href="/admin/dashboard" class="back-link">← ダッシュボードに戻る</a>
    <h1>ユーザー管理</h1>
    <FilterLinks
      basePath="/admin/users"
      paramKey="user_type"
      current={filter}
      options={[
        ["parent", "親"],
        ["grandparent", "祖父母"],
        ["admin", "管理者"],
      ]}
    />
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>名前</th>
            <th>メールアドレス</th>
            <th>種別</th>
            <th>登録日時</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr>
              <td>{user.id}</td>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{USER_TYPE_LABELS[user.user_type] ?? user.user_type}</td>
              <td>{formatDateTime(user.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {users.length === 0 && (
      <div class="card">
        <p class="card-sub">該当するユーザーはいません。</p>
      </div>
    )}
  </>
);

export const AdminSouvenirsPage: FC<{
  souvenirs: (SouvenirRow & { orderCount: number })[];
  filter: string;
}> = ({ souvenirs, filter }) => (
  <>
    <a href="/admin/dashboard" class="back-link">← ダッシュボードに戻る</a>
    <h1>記念品カタログ管理</h1>
    <p>
      <a href="/admin/souvenirs/new" class="btn btn-primary">＋ 記念品を登録</a>
    </p>
    <FilterLinks
      basePath="/admin/souvenirs"
      paramKey="status"
      current={filter}
      options={[
        ["active", "掲載中"],
        ["inactive", "非掲載"],
      ]}
    />
    {souvenirs.length === 0 ? (
      <div class="card">
        <p class="card-sub">該当する記念品はありません。</p>
      </div>
    ) : (
      <ul class="item-list">
        {souvenirs.map((souvenir) => (
          <li class="card">
            <div class="item-head">
              <h3>{souvenir.name}</h3>
              {souvenir.active ? (
                <span class="tag tag-accepted">掲載中</span>
              ) : (
                <span class="tag tag-expired">非掲載</span>
              )}
            </div>
            <p class="item-meta">
              <span class="item-price">{formatPrice(souvenir.price)}</span> ・ 注文{" "}
              {souvenir.orderCount} 件 ・ 画像{souvenir.image_r2_key ? "あり" : "なし"}
            </p>
            {souvenir.description && <p class="card-sub">{souvenir.description}</p>}
            <div class="card-actions">
              <a href={`/admin/souvenirs/${souvenir.id}/edit`} class="btn btn-secondary">
                編集
              </a>
              {souvenir.active ? (
                <form action={`/admin/souvenirs/${souvenir.id}/deactivate`} method="post">
                  <button type="submit" class="btn btn-outline">非掲載にする</button>
                </form>
              ) : (
                <form action={`/admin/souvenirs/${souvenir.id}/activate`} method="post">
                  <button type="submit" class="btn btn-outline">掲載する</button>
                </form>
              )}
              {souvenir.orderCount === 0 && (
                <form
                  action={`/admin/souvenirs/${souvenir.id}/delete`}
                  method="post"
                  data-confirm={`「${souvenir.name}」を削除します。よろしいですか？`}
                >
                  <button type="submit" class="btn btn-danger">削除</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </>
);

export type SouvenirFormValues = {
  name: string;
  price: string;
  description: string;
};

export const AdminSouvenirFormPage: FC<{
  souvenir: SouvenirRow | null; // null なら新規登録
  values: SouvenirFormValues;
  errors: string[];
}> = ({ souvenir, values, errors }) => (
  <>
    <a href="/admin/souvenirs" class="back-link">← カタログ管理に戻る</a>
    <h1>{souvenir ? "記念品の編集" : "記念品の登録"}</h1>
    <div class="card">
      <FormErrors errors={errors} />
      <form
        action={souvenir ? `/admin/souvenirs/${souvenir.id}` : "/admin/souvenirs"}
        method="post"
        enctype="multipart/form-data"
      >
        <div class="form-group">
          <label for="name">商品名</label>
          <input type="text" id="name" name="name" value={values.name} required />
        </div>
        <div class="form-group">
          <label for="price">価格（円・税込）</label>
          <input type="number" id="price" name="price" value={values.price} min="1" required />
        </div>
        <div class="form-group">
          <label for="description">説明（任意）</label>
          {/* textarea 内は改行を入れると値に混ざるため1行で書く */}
          <textarea id="description" name="description">{values.description}</textarea>
        </div>
        <div class="form-group">
          <label for="image">商品画像（JPEG/PNG・10MB以下）</label>
          {souvenir?.image_r2_key && (
            <p>
              <img
                src={`/souvenirs/${souvenir.id}/image`}
                alt={`${souvenir.name}の現在の画像`}
                class="souvenir-image"
              />
            </p>
          )}
          <input type="file" id="image" name="image" accept="image/jpeg,image/png" />
          {souvenir?.image_r2_key && (
            <p class="form-hint">新しい画像を選ぶと差し替えます（選ばなければ現在のまま）</p>
          )}
        </div>
        <button type="submit" class="btn btn-primary">
          {souvenir ? "更新する" : "登録する"}
        </button>
      </form>
    </div>
  </>
);

export const AdminOrdersPage: FC<{ orders: SouvenirOrderListRow[]; filter: string }> = ({
  orders,
  filter,
}) => (
  <>
    <a href="/admin/dashboard" class="back-link">← ダッシュボードに戻る</a>
    <h1>注文管理</h1>
    <FilterLinks
      basePath="/admin/orders"
      paramKey="status"
      current={filter}
      options={[
        ["pending", ORDER_STATUS_LABELS.pending],
        ["processing", ORDER_STATUS_LABELS.processing],
        ["shipped", ORDER_STATUS_LABELS.shipped],
        ["delivered", ORDER_STATUS_LABELS.delivered],
        ["cancelled", ORDER_STATUS_LABELS.cancelled],
      ]}
    />
    {orders.length === 0 ? (
      <div class="card">
        <p class="card-sub">該当する注文はありません。</p>
      </div>
    ) : (
      <ul class="item-list">
        {orders.map((order) => (
          <li class="card">
            <div class="item-head">
              <h3>
                #{order.id} {order.souvenir_name}
              </h3>
              <OrderStatusTag status={order.status} />
            </div>
            <p class="item-meta">
              <span class="item-price">{formatPrice(order.souvenir_price)}</span> ・{" "}
              {order.child_name}さんのイラスト ・ 注文日時: {formatDateTime(order.created_at)}
            </p>
            <p class="item-meta">
              注文者: {order.orderer_name}（{order.orderer_email}）
            </p>
            <p class="item-meta">
              お届け先: {order.recipient_name}様 / {order.shipping_address}
              {order.contact_phone && <> / ☎ {order.contact_phone}</>}
            </p>
            {nextOrderStatuses(order.status).length > 0 && (
              <div class="card-actions">
                {nextOrderStatuses(order.status).map((next) => (
                  <form
                    action={`/admin/orders/${order.id}/status`}
                    method="post"
                    data-confirm={`注文 #${order.id} を「${ORDER_STATUS_LABELS[next]}」にします。よろしいですか？`}
                  >
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      class={next === "cancelled" ? "btn btn-danger" : "btn btn-secondary"}
                    >
                      {ORDER_STATUS_LABELS[next]}にする
                    </button>
                  </form>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    )}
  </>
);
