// D1 クエリ層。Rails の各モデル（Child, Photo, Invitation, WishlistItem,
// PurchaseNotification）の関連・スコープをSQLで書き下したもの。

export type ChildRow = {
  id: number;
  name: string;
  birthdate: string | null;
  user_id: number;
  created_at: string;
};

export type PhotoRow = {
  id: number;
  child_id: number;
  r2_key: string;
  filename: string;
  content_type: string;
  byte_size: number;
  created_at: string;
};

export type InvitationRow = {
  id: number;
  token: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  parent_id: number;
  child_id: number;
  grandparent_id: number | null;
  created_at: string;
  updated_at: string;
};

export type WishlistItemRow = {
  id: number;
  name: string;
  url: string;
  price: number | null;
  description: string | null;
  category: string | null;
  quantity: number;
  purchased: number;
  purchased_by_id: number | null;
  purchased_at: string | null;
  child_id: number;
  created_at: string;
};

export type PurchaseNotificationRow = {
  id: number;
  user_id: number;
  wishlist_item_id: number;
  grandparent_id: number;
  read: number;
  message: string | null;
  created_at: string;
  // JOIN で付ける表示用フィールド
  item_name: string;
  child_name: string;
  grandparent_name: string;
};

const nowIso = () => new Date().toISOString();

// ---- children ----

export async function listChildren(db: D1Database, parentId: number): Promise<ChildRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM children WHERE user_id = ? ORDER BY created_at")
    .bind(parentId)
    .all<ChildRow>();
  return results;
}

export async function findChild(db: D1Database, id: number): Promise<ChildRow | null> {
  return db.prepare("SELECT * FROM children WHERE id = ?").bind(id).first<ChildRow>();
}

export async function createChild(
  db: D1Database,
  parentId: number,
  name: string,
  birthdate: string | null,
): Promise<void> {
  await db
    .prepare("INSERT INTO children (name, birthdate, user_id) VALUES (?, ?, ?)")
    .bind(name, birthdate, parentId)
    .run();
}

export async function updateChild(
  db: D1Database,
  id: number,
  name: string,
  birthdate: string | null,
): Promise<void> {
  await db
    .prepare("UPDATE children SET name = ?, birthdate = ?, updated_at = ? WHERE id = ?")
    .bind(name, birthdate, nowIso(), id)
    .run();
}

export async function deleteChild(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM children WHERE id = ?").bind(id).run();
}

// 祖父母から見た孫一覧（accepted な招待経由。Rails: current_user.grandchildren）
export async function listGrandchildren(
  db: D1Database,
  grandparentId: number,
): Promise<ChildRow[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT c.* FROM children c
       JOIN invitations i ON i.child_id = c.id
       WHERE i.status = 'accepted' AND i.grandparent_id = ?
       ORDER BY c.created_at`,
    )
    .bind(grandparentId)
    .all<ChildRow>();
  return results;
}

// 祖父母がその子の情報を見てよいか（accepted な招待があるか）
export async function grandparentHasChild(
  db: D1Database,
  grandparentId: number,
  childId: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM invitations
       WHERE status = 'accepted' AND grandparent_id = ? AND child_id = ? LIMIT 1`,
    )
    .bind(grandparentId, childId)
    .first<{ ok: number }>();
  return row !== null;
}

// ---- photos ----

export async function listPhotos(db: D1Database, childId: number): Promise<PhotoRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM photos WHERE child_id = ? ORDER BY created_at DESC, id DESC")
    .bind(childId)
    .all<PhotoRow>();
  return results;
}

export async function findPhoto(db: D1Database, id: number): Promise<PhotoRow | null> {
  return db.prepare("SELECT * FROM photos WHERE id = ?").bind(id).first<PhotoRow>();
}

export async function createPhoto(
  db: D1Database,
  photo: Omit<PhotoRow, "id" | "created_at">,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO photos (child_id, r2_key, filename, content_type, byte_size) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(photo.child_id, photo.r2_key, photo.filename, photo.content_type, photo.byte_size)
    .run();
}

export async function deletePhoto(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
}

// 子どもの全写真キー（子ども削除時に R2 も掃除するため）
export async function listPhotoKeys(db: D1Database, childId: number): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT r2_key FROM photos WHERE child_id = ?")
    .bind(childId)
    .all<{ r2_key: string }>();
  return results.map((r) => r.r2_key);
}

// ---- invitations ----

export const INVITATION_EXPIRY_DAYS = 7;

export function invitationExpired(inv: Pick<InvitationRow, "status" | "expires_at">): boolean {
  // Rails: expires_at < Time.current || status == 'expired'（accepted 済みも受諾には使えない）
  return inv.status !== "pending" || inv.expires_at < nowIso();
}

export async function listInvitations(
  db: D1Database,
  childId: number,
): Promise<InvitationRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM invitations WHERE child_id = ? ORDER BY created_at DESC")
    .bind(childId)
    .all<InvitationRow>();
  return results;
}

export async function createInvitation(
  db: D1Database,
  token: string,
  parentId: number,
  childId: number,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await db
    .prepare(
      "INSERT INTO invitations (token, status, expires_at, parent_id, child_id) VALUES (?, 'pending', ?, ?, ?)",
    )
    .bind(token, expiresAt, parentId, childId)
    .run();
}

export async function findInvitation(db: D1Database, id: number): Promise<InvitationRow | null> {
  return db.prepare("SELECT * FROM invitations WHERE id = ?").bind(id).first<InvitationRow>();
}

export async function findInvitationByToken(
  db: D1Database,
  token: string,
): Promise<InvitationRow | null> {
  return db
    .prepare("SELECT * FROM invitations WHERE token = ?")
    .bind(token)
    .first<InvitationRow>();
}

export async function acceptInvitation(
  db: D1Database,
  id: number,
  grandparentId: number,
): Promise<void> {
  await db
    .prepare(
      "UPDATE invitations SET status = 'accepted', grandparent_id = ?, updated_at = ? WHERE id = ?",
    )
    .bind(grandparentId, nowIso(), id)
    .run();
}

export async function expireInvitation(db: D1Database, id: number): Promise<void> {
  await db
    .prepare("UPDATE invitations SET status = 'expired', updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();
}

// ---- wishlist_items ----

export const WISHLIST_MAX_PER_CHILD = 10;

export async function listWishlistItems(
  db: D1Database,
  childId: number,
): Promise<WishlistItemRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM wishlist_items WHERE child_id = ? ORDER BY created_at DESC")
    .bind(childId)
    .all<WishlistItemRow>();
  return results;
}

export async function countWishlistItems(db: D1Database, childId: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM wishlist_items WHERE child_id = ?")
    .bind(childId)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function findWishlistItem(
  db: D1Database,
  id: number,
): Promise<WishlistItemRow | null> {
  return db.prepare("SELECT * FROM wishlist_items WHERE id = ?").bind(id).first<WishlistItemRow>();
}

export type WishlistItemInput = {
  name: string;
  url: string;
  price: number | null;
  description: string | null;
  category: string | null;
  quantity: number;
};

export async function createWishlistItem(
  db: D1Database,
  childId: number,
  item: WishlistItemInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO wishlist_items (name, url, price, description, category, quantity, child_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(item.name, item.url, item.price, item.description, item.category, item.quantity, childId)
    .run();
}

export async function updateWishlistItem(
  db: D1Database,
  id: number,
  item: WishlistItemInput,
): Promise<void> {
  await db
    .prepare(
      `UPDATE wishlist_items
       SET name = ?, url = ?, price = ?, description = ?, category = ?, quantity = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      item.name,
      item.url,
      item.price,
      item.description,
      item.category,
      item.quantity,
      nowIso(),
      id,
    )
    .run();
}

export async function deleteWishlistItem(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM wishlist_items WHERE id = ?").bind(id).run();
}

// 購入報告 + 親への通知をまとめて実行（Rails: WishlistItem#mark_as_purchased の transaction 相当）
export async function markAsPurchased(
  db: D1Database,
  item: WishlistItemRow,
  parentId: number,
  grandparentId: number,
  message: string | null,
): Promise<void> {
  const now = nowIso();
  await db.batch([
    db
      .prepare(
        "UPDATE wishlist_items SET purchased = 1, purchased_by_id = ?, purchased_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(grandparentId, now, now, item.id),
    db
      .prepare(
        "INSERT INTO purchase_notifications (user_id, wishlist_item_id, grandparent_id, message) VALUES (?, ?, ?, ?)",
      )
      .bind(parentId, item.id, grandparentId, message),
  ]);
}

// ---- purchase_notifications ----

export async function listNotifications(
  db: D1Database,
  parentId: number,
  filter: "all" | "unread" | "read",
): Promise<PurchaseNotificationRow[]> {
  const where =
    filter === "unread" ? "AND n.read = 0" : filter === "read" ? "AND n.read = 1" : "";
  const { results } = await db
    .prepare(
      `SELECT n.*, w.name AS item_name, c.name AS child_name, g.name AS grandparent_name
       FROM purchase_notifications n
       JOIN wishlist_items w ON w.id = n.wishlist_item_id
       JOIN children c ON c.id = w.child_id
       JOIN users g ON g.id = n.grandparent_id
       WHERE n.user_id = ? ${where}
       ORDER BY n.created_at DESC`,
    )
    .bind(parentId)
    .all<PurchaseNotificationRow>();
  return results;
}

export async function countUnreadNotifications(
  db: D1Database,
  parentId: number,
): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM purchase_notifications WHERE user_id = ? AND read = 0")
    .bind(parentId)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export async function markNotificationRead(db: D1Database, id: number): Promise<void> {
  await db
    .prepare("UPDATE purchase_notifications SET read = 1, updated_at = ? WHERE id = ?")
    .bind(nowIso(), id)
    .run();
}

export async function findNotification(
  db: D1Database,
  id: number,
): Promise<{ id: number; user_id: number } | null> {
  return db
    .prepare("SELECT id, user_id FROM purchase_notifications WHERE id = ?")
    .bind(id)
    .first<{ id: number; user_id: number }>();
}

// ---- souvenirs（記念品カタログ）----

export type SouvenirRow = {
  id: number;
  name: string;
  description: string | null;
  price: number; // 円
  active: number;
  image_r2_key: string | null;
  image_content_type: string | null;
  created_at: string;
  updated_at: string;
};

export type SouvenirInput = {
  name: string;
  description: string | null;
  price: number;
};

export async function listSouvenirs(
  db: D1Database,
  filter: "all" | "active" | "inactive",
): Promise<SouvenirRow[]> {
  const where = filter === "active" ? "WHERE active = 1" : filter === "inactive" ? "WHERE active = 0" : "";
  const { results } = await db
    .prepare(`SELECT * FROM souvenirs ${where} ORDER BY created_at DESC, id DESC`)
    .all<SouvenirRow>();
  return results;
}

export async function findSouvenir(db: D1Database, id: number): Promise<SouvenirRow | null> {
  return db.prepare("SELECT * FROM souvenirs WHERE id = ?").bind(id).first<SouvenirRow>();
}

export async function createSouvenir(
  db: D1Database,
  input: SouvenirInput,
  image: { r2_key: string; content_type: string } | null,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO souvenirs (name, description, price, image_r2_key, image_content_type) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(input.name, input.description, input.price, image?.r2_key ?? null, image?.content_type ?? null)
    .run();
}

export async function updateSouvenir(
  db: D1Database,
  id: number,
  input: SouvenirInput,
): Promise<void> {
  await db
    .prepare("UPDATE souvenirs SET name = ?, description = ?, price = ?, updated_at = ? WHERE id = ?")
    .bind(input.name, input.description, input.price, nowIso(), id)
    .run();
}

export async function updateSouvenirImage(
  db: D1Database,
  id: number,
  image: { r2_key: string; content_type: string },
): Promise<void> {
  await db
    .prepare("UPDATE souvenirs SET image_r2_key = ?, image_content_type = ?, updated_at = ? WHERE id = ?")
    .bind(image.r2_key, image.content_type, nowIso(), id)
    .run();
}

export async function setSouvenirActive(
  db: D1Database,
  id: number,
  active: boolean,
): Promise<void> {
  await db
    .prepare("UPDATE souvenirs SET active = ?, updated_at = ? WHERE id = ?")
    .bind(active ? 1 : 0, nowIso(), id)
    .run();
}

export async function deleteSouvenir(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM souvenirs WHERE id = ?").bind(id).run();
}

export async function countOrdersForSouvenir(db: D1Database, souvenirId: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS c FROM souvenir_orders WHERE souvenir_id = ?")
    .bind(souvenirId)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

// ---- souvenir_orders（記念品の注文）----

export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Rails版の process!/ship!/deliver!/cancel! は無制限だったが、逆行や
// 完了後の変更は事故のもとなので一方向の遷移だけ許可する
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function nextOrderStatuses(from: string): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[from as OrderStatus] ?? [];
}

export function canTransitionOrderStatus(from: string, to: string): boolean {
  return (nextOrderStatuses(from) as readonly string[]).includes(to);
}

export type SouvenirOrderRow = {
  id: number;
  user_id: number;
  souvenir_id: number;
  child_id: number;
  status: OrderStatus;
  shipping_address: string;
  recipient_name: string;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

// 一覧表示用（JOIN で付けるフィールド込み）
export type SouvenirOrderListRow = SouvenirOrderRow & {
  souvenir_name: string;
  souvenir_price: number;
  child_name: string;
  orderer_name: string;
  orderer_email: string;
};

export type SouvenirOrderInput = {
  child_id: number;
  recipient_name: string;
  shipping_address: string;
  contact_phone: string | null;
};

export async function createSouvenirOrder(
  db: D1Database,
  grandparentId: number,
  souvenirId: number,
  input: SouvenirOrderInput,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO souvenir_orders (user_id, souvenir_id, child_id, shipping_address, recipient_name, contact_phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      grandparentId,
      souvenirId,
      input.child_id,
      input.shipping_address,
      input.recipient_name,
      input.contact_phone,
    )
    .run();
}

const ORDER_LIST_SELECT = `
  SELECT o.*, s.name AS souvenir_name, s.price AS souvenir_price,
         c.name AS child_name, u.name AS orderer_name, u.email AS orderer_email
  FROM souvenir_orders o
  JOIN souvenirs s ON s.id = o.souvenir_id
  JOIN children c ON c.id = o.child_id
  JOIN users u ON u.id = o.user_id`;

export async function listOrdersForGrandparent(
  db: D1Database,
  grandparentId: number,
): Promise<SouvenirOrderListRow[]> {
  const { results } = await db
    .prepare(`${ORDER_LIST_SELECT} WHERE o.user_id = ? ORDER BY o.created_at DESC, o.id DESC`)
    .bind(grandparentId)
    .all<SouvenirOrderListRow>();
  return results;
}

export async function listAllOrders(
  db: D1Database,
  status: OrderStatus | null,
): Promise<SouvenirOrderListRow[]> {
  const stmt = status
    ? db.prepare(`${ORDER_LIST_SELECT} WHERE o.status = ? ORDER BY o.created_at DESC, o.id DESC`).bind(status)
    : db.prepare(`${ORDER_LIST_SELECT} ORDER BY o.created_at DESC, o.id DESC`);
  const { results } = await stmt.all<SouvenirOrderListRow>();
  return results;
}

export async function findOrder(db: D1Database, id: number): Promise<SouvenirOrderRow | null> {
  return db.prepare("SELECT * FROM souvenir_orders WHERE id = ?").bind(id).first<SouvenirOrderRow>();
}

export async function updateOrderStatus(
  db: D1Database,
  id: number,
  status: OrderStatus,
): Promise<void> {
  await db
    .prepare("UPDATE souvenir_orders SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, nowIso(), id)
    .run();
}

// ---- 管理者向け ----

export type UserListRow = {
  id: number;
  name: string;
  email: string;
  user_type: string;
  created_at: string;
};

export async function listUsers(
  db: D1Database,
  userType: "parent" | "grandparent" | "admin" | null,
): Promise<UserListRow[]> {
  const stmt = userType
    ? db
        .prepare(
          "SELECT id, name, email, user_type, created_at FROM users WHERE user_type = ? ORDER BY created_at DESC, id DESC",
        )
        .bind(userType)
    : db.prepare("SELECT id, name, email, user_type, created_at FROM users ORDER BY created_at DESC, id DESC");
  const { results } = await stmt.all<UserListRow>();
  return results;
}

export type AdminDashboardCounts = {
  parents: number;
  grandparents: number;
  children: number;
  orders: number;
  pendingOrders: number;
};

export async function adminDashboardCounts(db: D1Database): Promise<AdminDashboardCounts> {
  const results = await db.batch([
    db.prepare("SELECT user_type, COUNT(*) AS c FROM users GROUP BY user_type"),
    db.prepare("SELECT COUNT(*) AS c FROM children"),
    db.prepare(
      "SELECT COUNT(*) AS c, COALESCE(SUM(status = 'pending'), 0) AS p FROM souvenir_orders",
    ),
  ]);
  const byType = new Map(
    ((results[0]?.results ?? []) as { user_type: string; c: number }[]).map((r) => [
      r.user_type,
      r.c,
    ]),
  );
  const childRow = (results[1]?.results[0] ?? { c: 0 }) as { c: number };
  const orderRow = (results[2]?.results[0] ?? { c: 0, p: 0 }) as { c: number; p: number };
  return {
    parents: byType.get("parent") ?? 0,
    grandparents: byType.get("grandparent") ?? 0,
    children: childRow.c,
    orders: orderRow.c,
    pendingOrders: orderRow.p,
  };
}
