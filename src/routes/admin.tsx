// 管理者向け: ダッシュボード・ユーザー管理・記念品カタログ管理・注文管理
// （Rails: AdminsController + Admin::SouvenirsController + Admin::SouvenirOrdersController 相当）。
import { Hono } from "hono";
import type { AppEnv } from "../app-env";
import { dashboardPath } from "../app-env";
import {
  adminDashboardCounts,
  canTransitionOrderStatus,
  countOrdersForSouvenir,
  createSouvenir,
  deleteSouvenir,
  findOrder,
  findSouvenir,
  listAllOrders,
  listSouvenirs,
  listUsers,
  ORDER_STATUSES,
  OrderStatus,
  setSouvenirActive,
  SouvenirInput,
  updateOrderStatus,
  updateSouvenir,
  updateSouvenirImage,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { validatePhotoFile } from "./photos";
import { renderPage } from "../views/layout";
import {
  AdminDashboard,
  AdminOrdersPage,
  AdminSouvenirFormPage,
  AdminSouvenirsPage,
  AdminUsersPage,
  SouvenirFormValues,
} from "../views/admin";

export const adminRoutes = new Hono<AppEnv>();

// Rails の require_admin 相当（パス限定必須 — NOTES.md 参照）
adminRoutes.use("/admin/*", async (c, next) => {
  if (c.var.user.userType !== "admin") {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect(dashboardPath(c.var.user.userType));
  }
  await next();
});

// Rails の Souvenir バリデーション相当
export function parseSouvenirForm(form: Record<string, unknown>): {
  input: SouvenirInput;
  values: SouvenirFormValues;
  errors: string[];
} {
  const str = (key: string) => (typeof form[key] === "string" ? (form[key] as string).trim() : "");
  const values: SouvenirFormValues = {
    name: str("name"),
    price: str("price"),
    description: str("description"),
  };

  const errors: string[] = [];
  if (values.name === "") errors.push("商品名を入力してください");
  const price = Number(values.price);
  if (values.price === "" || !Number.isInteger(price) || price <= 0) {
    errors.push("価格は1円以上の整数で入力してください");
  }

  return {
    input: {
      name: values.name,
      description: values.description === "" ? null : values.description,
      price,
    },
    values,
    errors,
  };
}

adminRoutes.get("/admin/dashboard", async (c) => {
  const counts = await adminDashboardCounts(c.env.DB);
  return renderPage(
    c,
    { title: "管理者ダッシュボード", user: c.var.user },
    <AdminDashboard counts={counts} />,
  );
});

// ---- ユーザー管理（Rails版と同じく閲覧のみ。削除はカスケード整理が必要なため未実装）----

adminRoutes.get("/admin/users", async (c) => {
  const raw = c.req.query("user_type") ?? "";
  const filter = raw === "parent" || raw === "grandparent" || raw === "admin" ? raw : null;
  const users = await listUsers(c.env.DB, filter);
  return renderPage(
    c,
    { title: "ユーザー管理", user: c.var.user },
    <AdminUsersPage users={users} filter={filter ?? ""} />,
  );
});

// ---- 記念品カタログ管理 ----

const emptySouvenirValues: SouvenirFormValues = { name: "", price: "", description: "" };

adminRoutes.get("/admin/souvenirs", async (c) => {
  const raw = c.req.query("status") ?? "";
  const filter = raw === "active" || raw === "inactive" ? raw : "all";
  const souvenirs = await listSouvenirs(c.env.DB, filter);
  const withCounts = await Promise.all(
    souvenirs.map(async (s) => ({
      ...s,
      orderCount: await countOrdersForSouvenir(c.env.DB, s.id),
    })),
  );
  return renderPage(
    c,
    { title: "記念品カタログ管理", user: c.var.user },
    <AdminSouvenirsPage souvenirs={withCounts} filter={filter === "all" ? "" : filter} />,
  );
});

adminRoutes.get("/admin/souvenirs/new", (c) =>
  renderPage(
    c,
    { title: "記念品の登録", user: c.var.user },
    <AdminSouvenirFormPage souvenir={null} values={emptySouvenirValues} errors={[]} />,
  ),
);

// フォームの画像ファイルを取り出して検証。画像なしは null、検証エラーは文字列を返す
function pickImageFile(form: Record<string, unknown>): File | null | string {
  const file = form["image"];
  if (!(file instanceof File) || file.size === 0) return null;
  const error = validatePhotoFile(file);
  return error ? `商品画像: ${error}` : file;
}

adminRoutes.post("/admin/souvenirs", async (c) => {
  const form = await c.req.parseBody();
  const { input, values, errors } = parseSouvenirForm(form);
  const image = pickImageFile(form);
  if (typeof image === "string") errors.push(image);

  if (errors.length > 0 || typeof image === "string") {
    return renderPage(
      c,
      { title: "記念品の登録", user: c.var.user, status: 422 },
      <AdminSouvenirFormPage souvenir={null} values={values} errors={errors} />,
    );
  }

  let stored: { r2_key: string; content_type: string } | null = null;
  if (image) {
    stored = { r2_key: `souvenirs/${crypto.randomUUID()}`, content_type: image.type };
    await c.env.PHOTOS.put(stored.r2_key, image, { httpMetadata: { contentType: image.type } });
  }
  await createSouvenir(c.env.DB, input, stored);
  setFlash(c, { notice: "記念品を登録しました" });
  return c.redirect("/admin/souvenirs");
});

adminRoutes.get("/admin/souvenirs/:id/edit", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir) return c.notFound();
  return renderPage(
    c,
    { title: "記念品の編集", user: c.var.user },
    <AdminSouvenirFormPage
      souvenir={souvenir}
      values={{
        name: souvenir.name,
        price: String(souvenir.price),
        description: souvenir.description ?? "",
      }}
      errors={[]}
    />,
  );
});

adminRoutes.post("/admin/souvenirs/:id", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir) return c.notFound();

  const form = await c.req.parseBody();
  const { input, values, errors } = parseSouvenirForm(form);
  const image = pickImageFile(form);
  if (typeof image === "string") errors.push(image);

  if (errors.length > 0 || typeof image === "string") {
    return renderPage(
      c,
      { title: "記念品の編集", user: c.var.user, status: 422 },
      <AdminSouvenirFormPage souvenir={souvenir} values={values} errors={errors} />,
    );
  }

  await updateSouvenir(c.env.DB, souvenir.id, input);
  if (image) {
    const stored = { r2_key: `souvenirs/${crypto.randomUUID()}`, content_type: image.type };
    await c.env.PHOTOS.put(stored.r2_key, image, { httpMetadata: { contentType: image.type } });
    await updateSouvenirImage(c.env.DB, souvenir.id, stored);
    if (souvenir.image_r2_key) await c.env.PHOTOS.delete(souvenir.image_r2_key);
  }
  setFlash(c, { notice: "記念品情報を更新しました" });
  return c.redirect("/admin/souvenirs");
});

adminRoutes.post("/admin/souvenirs/:id/activate", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir) return c.notFound();
  await setSouvenirActive(c.env.DB, souvenir.id, true);
  setFlash(c, { notice: "記念品を掲載しました" });
  return c.redirect("/admin/souvenirs");
});

adminRoutes.post("/admin/souvenirs/:id/deactivate", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir) return c.notFound();
  await setSouvenirActive(c.env.DB, souvenir.id, false);
  setFlash(c, { notice: "記念品を非掲載にしました" });
  return c.redirect("/admin/souvenirs");
});

adminRoutes.post("/admin/souvenirs/:id/delete", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir) return c.notFound();
  // 注文履歴を守るため、注文が付いた記念品は削除させない（非掲載で運用）
  if ((await countOrdersForSouvenir(c.env.DB, souvenir.id)) > 0) {
    setFlash(c, { alert: "注文のある記念品は削除できません。非掲載にしてください" });
    return c.redirect("/admin/souvenirs");
  }
  if (souvenir.image_r2_key) await c.env.PHOTOS.delete(souvenir.image_r2_key);
  await deleteSouvenir(c.env.DB, souvenir.id);
  setFlash(c, { notice: "記念品を削除しました" });
  return c.redirect("/admin/souvenirs");
});

// ---- 注文管理 ----

adminRoutes.get("/admin/orders", async (c) => {
  const raw = c.req.query("status") ?? "";
  const filter = (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : null;
  const orders = await listAllOrders(c.env.DB, filter);
  return renderPage(
    c,
    { title: "注文管理", user: c.var.user },
    <AdminOrdersPage orders={orders} filter={filter ?? ""} />,
  );
});

adminRoutes.post("/admin/orders/:id/status", async (c) => {
  const order = await findOrder(c.env.DB, Number(c.req.param("id")));
  if (!order) return c.notFound();

  const form = await c.req.parseBody();
  const next = typeof form["status"] === "string" ? form["status"] : "";
  if (!(ORDER_STATUSES as readonly string[]).includes(next) ||
      !canTransitionOrderStatus(order.status, next)) {
    setFlash(c, { alert: "このステータスには変更できません" });
    return c.redirect("/admin/orders");
  }

  await updateOrderStatus(c.env.DB, order.id, next as OrderStatus);
  setFlash(c, { notice: `注文 #${order.id} を更新しました` });
  return c.redirect("/admin/orders");
});
