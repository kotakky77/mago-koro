// 親向け: ダッシュボードと子どもCRUD（Rails: parents#dashboard, children コントローラー相当）。
// このルート群は app.tsx で requireLogin 済み。ここで親ロールを要求する。
import { Hono } from "hono";
import type { Context } from "hono";
import type { AppEnv } from "../app-env";
import { dashboardPath } from "../app-env";
import {
  ChildRow,
  countWishlistItems,
  createChild,
  deleteChild,
  findChild,
  listChildren,
  listPhotoKeys,
  listPhotos,
  updateChild,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { renderPage } from "../views/layout";
import { ChildFormPage, ParentDashboard } from "../views/parent";

export const childrenRoutes = new Hono<AppEnv>();

// Rails の require_parent 相当
export function requireParent() {
  return async (c: Context<AppEnv>, next: () => Promise<void>) => {
    if (c.var.user.userType !== "parent") {
      setFlash(c, { alert: "アクセス権限がありません" });
      return c.redirect(dashboardPath(c.var.user.userType));
    }
    await next();
  };
}

// Rails の correct_parent 相当。自分の子どもでなければ null（呼び出し側でリダイレクト）
export async function loadOwnChild(
  c: Context<AppEnv>,
  childId: number,
): Promise<ChildRow | null> {
  const child = await findChild(c.env.DB, childId);
  if (!child || child.user_id !== c.var.user.userId) return null;
  return child;
}

export function deniedRedirect(c: Context<AppEnv>): Response {
  setFlash(c, { alert: "アクセス権限がありません" });
  return c.redirect("/parent/dashboard");
}

// 注意: "*" にすると app.tsx でマージされた後続の祖父母ルートにも効いてしまうため、
// 親専用のパスに限定して掛ける（/children/* は wishlist・invitations のネストも守る）
childrenRoutes.use("/parent/*", requireParent());
childrenRoutes.use("/children/*", requireParent());

childrenRoutes.get("/parent/dashboard", async (c) => {
  const children = await listChildren(c.env.DB, c.var.user.userId);
  const summaries = await Promise.all(
    children.map(async (child) => {
      const [photos, wishlistCount] = await Promise.all([
        listPhotos(c.env.DB, child.id),
        countWishlistItems(c.env.DB, child.id),
      ]);
      return { ...child, photoCount: photos.length, wishlistCount };
    }),
  );
  return renderPage(
    c,
    { title: "マイページ", user: c.var.user },
    <ParentDashboard userName={c.var.user.name} children_={summaries} />,
  );
});

childrenRoutes.get("/children/new", (c) =>
  renderPage(
    c,
    { title: "お子さんの登録", user: c.var.user },
    <ChildFormPage errors={[]} child={{ name: "", birthdate: "" }} />,
  ),
);

function parseChildForm(form: Record<string, unknown>): {
  name: string;
  birthdate: string | null;
  errors: string[];
} {
  const name = typeof form["name"] === "string" ? form["name"].trim() : "";
  const birthdateRaw = typeof form["birthdate"] === "string" ? form["birthdate"] : "";
  const errors: string[] = [];
  if (name === "") errors.push("お名前を入力してください");
  if (name.length > 50) errors.push("お名前は50文字以内で入力してください");
  let birthdate: string | null = null;
  if (birthdateRaw !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdateRaw)) {
      errors.push("誕生日の形式が正しくありません");
    } else {
      birthdate = birthdateRaw;
    }
  }
  return { name, birthdate, errors };
}

childrenRoutes.post("/children", async (c) => {
  const { name, birthdate, errors } = parseChildForm(await c.req.parseBody());
  if (errors.length > 0) {
    return renderPage(
      c,
      { title: "お子さんの登録", user: c.var.user, status: 422 },
      <ChildFormPage errors={errors} child={{ name, birthdate: birthdate ?? "" }} />,
    );
  }
  await createChild(c.env.DB, c.var.user.userId, name, birthdate);
  setFlash(c, { notice: "お子さんを登録しました" });
  return c.redirect("/parent/dashboard");
});

childrenRoutes.get("/children/:id/edit", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  return renderPage(
    c,
    { title: "お子さんの編集", user: c.var.user },
    <ChildFormPage
      errors={[]}
      child={{ id: child.id, name: child.name, birthdate: child.birthdate ?? "" }}
    />,
  );
});

childrenRoutes.post("/children/:id", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  const { name, birthdate, errors } = parseChildForm(await c.req.parseBody());
  if (errors.length > 0) {
    return renderPage(
      c,
      { title: "お子さんの編集", user: c.var.user, status: 422 },
      <ChildFormPage errors={errors} child={{ id: child.id, name, birthdate: birthdate ?? "" }} />,
    );
  }
  await updateChild(c.env.DB, child.id, name, birthdate);
  setFlash(c, { notice: "お子さんの情報を更新しました" });
  return c.redirect("/parent/dashboard");
});

childrenRoutes.post("/children/:id/delete", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  // R2 の写真も掃除してから子どもを削除（DBは CASCADE で消える）
  const keys = await listPhotoKeys(c.env.DB, child.id);
  if (keys.length > 0) await c.env.PHOTOS.delete(keys);
  await deleteChild(c.env.DB, child.id);
  setFlash(c, { notice: `${child.name}さんの情報を削除しました` });
  return c.redirect("/parent/dashboard");
});
