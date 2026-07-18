// 親向け: ほしいものリストCRUD（Rails: WishlistItemsController の親側アクション相当）。
// 祖父母の閲覧・購入報告は grandparents.tsx にある。
import { Hono } from "hono";
import type { AppEnv } from "../app-env";
import {
  WISHLIST_MAX_PER_CHILD,
  WishlistItemInput,
  countWishlistItems,
  createWishlistItem,
  deleteWishlistItem,
  findWishlistItem,
  listWishlistItems,
  updateWishlistItem,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { deniedRedirect, loadOwnChild } from "./children";
import { renderPage } from "../views/layout";
import { WishlistFormPage, WishlistFormValues, WishlistIndexPage } from "../views/wishlist";

export const wishlistRoutes = new Hono<AppEnv>();

// ロールガードについて:
// - /children/:id/wishlist_items 系は children.tsx の use("/children/*", requireParent()) が守る
// - /wishlist_items/:id 系はミドルウェアを掛けない（"/wishlist_items/*" にすると祖父母の
//   POST /wishlist_items/:id/purchase まで弾いてしまう）。各ハンドラの loadOwnChild が
//   所有権チェックを兼ねる（親以外は自分の子どもを持たないため必ず拒否される）

const emptyValues: WishlistFormValues = {
  name: "",
  url: "",
  price: "",
  description: "",
  category: "",
  quantity: "1",
};

// Rails の WishlistItem バリデーション相当
export function parseWishlistForm(form: Record<string, unknown>): {
  input: WishlistItemInput;
  values: WishlistFormValues;
  errors: string[];
} {
  const str = (key: string) => (typeof form[key] === "string" ? (form[key] as string).trim() : "");
  const values: WishlistFormValues = {
    name: str("name"),
    url: str("url"),
    price: str("price"),
    description: str("description"),
    category: str("category"),
    quantity: str("quantity") || "1",
  };

  const errors: string[] = [];
  if (values.name === "") errors.push("商品名を入力してください");
  if (values.url === "") {
    errors.push("商品ページのURLを入力してください");
  } else if (!/^https?:\/\//.test(values.url)) {
    errors.push("URLは http:// または https:// で始まる必要があります");
  }
  const quantity = Number(values.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    errors.push("数量は1以上の整数で入力してください");
  }
  let price: number | null = null;
  if (values.price !== "") {
    price = Number(values.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push("価格は0以上の数値で入力してください");
      price = null;
    }
  }

  return {
    input: {
      name: values.name,
      url: values.url,
      price,
      description: values.description === "" ? null : values.description,
      category: values.category === "" ? null : values.category,
      quantity,
    },
    values,
    errors,
  };
}

wishlistRoutes.get("/children/:id/wishlist_items", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  const items = await listWishlistItems(c.env.DB, child.id);
  return renderPage(
    c,
    { title: `${child.name}さんのほしいものリスト`, user: c.var.user },
    <WishlistIndexPage child={child} items={items} />,
  );
});

wishlistRoutes.get("/children/:id/wishlist_items/new", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  return renderPage(
    c,
    { title: "ほしいものを追加", user: c.var.user },
    <WishlistFormPage child={child} errors={[]} values={emptyValues} />,
  );
});

wishlistRoutes.post("/children/:id/wishlist_items", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);

  const { input, values, errors } = parseWishlistForm(await c.req.parseBody());

  // 子ども1人あたり最大10件（Rails版の制限を踏襲）
  if ((await countWishlistItems(c.env.DB, child.id)) >= WISHLIST_MAX_PER_CHILD) {
    errors.push(`ほしいものは1人あたり${WISHLIST_MAX_PER_CHILD}件までです`);
  }

  if (errors.length > 0) {
    return renderPage(
      c,
      { title: "ほしいものを追加", user: c.var.user, status: 422 },
      <WishlistFormPage child={child} errors={errors} values={values} />,
    );
  }
  await createWishlistItem(c.env.DB, child.id, input);
  setFlash(c, { notice: "ほしいものリストに商品を追加しました" });
  return c.redirect(`/children/${child.id}/wishlist_items`);
});

wishlistRoutes.get("/wishlist_items/:id/edit", async (c) => {
  const item = await findWishlistItem(c.env.DB, Number(c.req.param("id")));
  if (!item) return deniedRedirect(c);
  const child = await loadOwnChild(c, item.child_id);
  if (!child) return deniedRedirect(c);
  return renderPage(
    c,
    { title: "ほしいものの編集", user: c.var.user },
    <WishlistFormPage
      child={child}
      itemId={item.id}
      errors={[]}
      values={{
        name: item.name,
        url: item.url,
        price: item.price === null ? "" : String(item.price),
        description: item.description ?? "",
        category: item.category ?? "",
        quantity: String(item.quantity),
      }}
    />,
  );
});

wishlistRoutes.post("/wishlist_items/:id", async (c) => {
  const item = await findWishlistItem(c.env.DB, Number(c.req.param("id")));
  if (!item) return deniedRedirect(c);
  const child = await loadOwnChild(c, item.child_id);
  if (!child) return deniedRedirect(c);

  const { input, values, errors } = parseWishlistForm(await c.req.parseBody());
  if (errors.length > 0) {
    return renderPage(
      c,
      { title: "ほしいものの編集", user: c.var.user, status: 422 },
      <WishlistFormPage child={child} itemId={item.id} errors={errors} values={values} />,
    );
  }
  await updateWishlistItem(c.env.DB, item.id, input);
  setFlash(c, { notice: "ほしいものの情報を更新しました" });
  return c.redirect(`/children/${child.id}/wishlist_items`);
});

wishlistRoutes.post("/wishlist_items/:id/delete", async (c) => {
  const item = await findWishlistItem(c.env.DB, Number(c.req.param("id")));
  if (!item) return deniedRedirect(c);
  const child = await loadOwnChild(c, item.child_id);
  if (!child) return deniedRedirect(c);

  await deleteWishlistItem(c.env.DB, item.id);
  setFlash(c, { notice: "ほしいものリストから削除しました" });
  return c.redirect(`/children/${child.id}/wishlist_items`);
});
