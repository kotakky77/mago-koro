// 祖父母向け: 記念品カタログ閲覧・注文（Rails: SouvenirsController + SouvenirOrdersController 相当）。
// 管理者側のカタログ・注文管理は admin.tsx にある。
import { Hono } from "hono";
import type { AppEnv } from "../app-env";
import { dashboardPath } from "../app-env";
import {
  createSouvenirOrder,
  findSouvenir,
  grandparentHasChild,
  listGrandchildren,
  listOrdersForGrandparent,
  listSouvenirs,
  SouvenirOrderInput,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { renderPage } from "../views/layout";
import {
  GrandparentOrdersPage,
  GrandparentSouvenirsPage,
  OrderFormValues,
  SouvenirOrderFormPage,
} from "../views/souvenirs";

export const souvenirRoutes = new Hono<AppEnv>();

// grandparents.tsx と同じロールガード（パス限定必須 — NOTES.md 参照）
souvenirRoutes.use("/grandparent/*", async (c, next) => {
  if (c.var.user.userType !== "grandparent") {
    setFlash(c, { alert: "アクセス権限がありません" });
    return c.redirect(dashboardPath(c.var.user.userType));
  }
  await next();
});

// Rails の SouvenirOrder バリデーション相当（parseWishlistForm 方式）
export function parseOrderForm(form: Record<string, unknown>): {
  input: SouvenirOrderInput;
  values: OrderFormValues;
  errors: string[];
} {
  const str = (key: string) => (typeof form[key] === "string" ? (form[key] as string).trim() : "");
  const values: OrderFormValues = {
    child_id: str("child_id"),
    recipient_name: str("recipient_name"),
    shipping_address: str("shipping_address"),
    contact_phone: str("contact_phone"),
  };

  const errors: string[] = [];
  const childId = Number(values.child_id);
  if (values.child_id === "" || !Number.isInteger(childId) || childId <= 0) {
    errors.push("お孫さんを選択してください");
  }
  if (values.recipient_name === "") errors.push("お届け先のお名前を入力してください");
  if (values.shipping_address === "") errors.push("お届け先の住所を入力してください");

  return {
    input: {
      child_id: childId,
      recipient_name: values.recipient_name,
      shipping_address: values.shipping_address,
      contact_phone: values.contact_phone === "" ? null : values.contact_phone,
    },
    values,
    errors,
  };
}

souvenirRoutes.get("/grandparent/souvenirs", async (c) => {
  const souvenirs = await listSouvenirs(c.env.DB, "active");
  return renderPage(
    c,
    { title: "記念品のご案内", user: c.var.user },
    <GrandparentSouvenirsPage souvenirs={souvenirs} />,
  );
});

souvenirRoutes.get("/grandparent/souvenirs/:id/order", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir || !souvenir.active) {
    setFlash(c, { alert: "この記念品は現在ご注文いただけません" });
    return c.redirect("/grandparent/souvenirs");
  }
  const grandchildren = await listGrandchildren(c.env.DB, c.var.user.userId);
  const values: OrderFormValues = {
    child_id: c.req.query("child_id") ?? "",
    recipient_name: "",
    shipping_address: "",
    contact_phone: "",
  };
  return renderPage(
    c,
    { title: "記念品の注文", user: c.var.user },
    <SouvenirOrderFormPage
      souvenir={souvenir}
      grandchildren={grandchildren}
      values={values}
      errors={[]}
    />,
  );
});

souvenirRoutes.post("/grandparent/souvenirs/:id/order", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir || !souvenir.active) {
    setFlash(c, { alert: "この記念品は現在ご注文いただけません" });
    return c.redirect("/grandparent/souvenirs");
  }

  const { input, values, errors } = parseOrderForm(await c.req.parseBody());

  // 選ばれた子が「招待済みの孫」でなければ拒否（所有権チェック）
  if (
    errors.length === 0 &&
    !(await grandparentHasChild(c.env.DB, c.var.user.userId, input.child_id))
  ) {
    errors.push("お孫さんを選択してください");
  }

  if (errors.length > 0) {
    const grandchildren = await listGrandchildren(c.env.DB, c.var.user.userId);
    return renderPage(
      c,
      { title: "記念品の注文", user: c.var.user, status: 422 },
      <SouvenirOrderFormPage
        souvenir={souvenir}
        grandchildren={grandchildren}
        values={values}
        errors={errors}
      />,
    );
  }

  await createSouvenirOrder(c.env.DB, c.var.user.userId, souvenir.id, input);
  setFlash(c, { notice: "ご注文を受け付けました。お届けまでしばらくお待ちください。" });
  return c.redirect("/grandparent/orders");
});

souvenirRoutes.get("/grandparent/orders", async (c) => {
  const orders = await listOrdersForGrandparent(c.env.DB, c.var.user.userId);
  return renderPage(
    c,
    { title: "注文の履歴", user: c.var.user },
    <GrandparentOrdersPage orders={orders} />,
  );
});

// ---- 商品画像の配信 ----
// カタログは全ロール共通の公開情報のためログインのみ要求（所有権チェック不要）。
// 無効化された商品の画像も注文履歴から参照されるため active では絞らない。
souvenirRoutes.get("/souvenirs/:id/image", async (c) => {
  const souvenir = await findSouvenir(c.env.DB, Number(c.req.param("id")));
  if (!souvenir?.image_r2_key) return c.notFound();
  const object = await c.env.PHOTOS.get(souvenir.image_r2_key);
  if (!object) return c.notFound();
  return new Response(object.body, {
    headers: {
      "Content-Type": souvenir.image_content_type ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Cache-Control": "private, max-age=3600",
      ETag: object.httpEtag,
    },
  });
});
