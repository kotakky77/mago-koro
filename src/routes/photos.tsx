// 写真: R2アップロード・認可付き配信・削除（Rails: Children::PhotosController + Active Storage の代替）。
// 配信は親・祖父母の両ロールが使うため、ロールガードはハンドラ内で行う。
import { Hono } from "hono";
import type { AppEnv } from "../app-env";
import {
  createPhoto,
  deletePhoto,
  findChild,
  findPhoto,
  grandparentHasChild,
  listPhotos,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { deniedRedirect, loadOwnChild } from "./children";
import { renderPage } from "../views/layout";
import { ChildPhotosPage } from "../views/photos";

export const photoRoutes = new Hono<AppEnv>();

// Rails の Child#validate_photo_size / validate_photo_format 相当
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png"];

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!PHOTO_CONTENT_TYPES.includes(file.type)) return "JPEG、PNG形式のみ対応しています";
  if (file.size > PHOTO_MAX_BYTES) return "画像サイズは10MB以下にしてください";
  return null;
}

// ---- 親向け: 一覧・アップロード・削除 ----

photoRoutes.get("/children/:id/photos", async (c) => {
  if (c.var.user.userType !== "parent") return deniedRedirect(c);
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  const photos = await listPhotos(c.env.DB, child.id);
  return renderPage(
    c,
    { title: `${child.name}さんの写真`, user: c.var.user },
    <ChildPhotosPage child={child} photos={photos} />,
  );
});

photoRoutes.post("/children/:id/photos", async (c) => {
  if (c.var.user.userType !== "parent") return deniedRedirect(c);
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);

  const body = await c.req.parseBody({ all: true });
  const raw = body["photos"];
  const files = (Array.isArray(raw) ? raw : [raw]).filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    setFlash(c, { alert: "写真を選択してください" });
    return c.redirect(`/children/${child.id}/photos`);
  }

  const errors: string[] = [];
  let uploaded = 0;
  for (const file of files) {
    const error = validatePhotoFile(file);
    if (error) {
      errors.push(`${file.name}: ${error}`);
      continue;
    }
    const key = `children/${child.id}/${crypto.randomUUID()}`;
    await c.env.PHOTOS.put(key, file, { httpMetadata: { contentType: file.type } });
    await createPhoto(c.env.DB, {
      child_id: child.id,
      r2_key: key,
      filename: file.name,
      content_type: file.type,
      byte_size: file.size,
    });
    uploaded += 1;
  }

  if (errors.length > 0) {
    setFlash(c, { alert: errors.join(" / ") });
  } else {
    setFlash(c, { notice: `写真を${uploaded}枚アップロードしました` });
  }
  return c.redirect(`/children/${child.id}/photos`);
});

photoRoutes.post("/photos/:id/delete", async (c) => {
  if (c.var.user.userType !== "parent") return deniedRedirect(c);
  const photo = await findPhoto(c.env.DB, Number(c.req.param("id")));
  if (!photo) return deniedRedirect(c);
  const child = await loadOwnChild(c, photo.child_id);
  if (!child) return deniedRedirect(c);

  await c.env.PHOTOS.delete(photo.r2_key);
  await deletePhoto(c.env.DB, photo.id);
  setFlash(c, { notice: "写真を削除しました" });
  return c.redirect(`/children/${child.id}/photos`);
});

// ---- 配信: 親（自分の子）または祖父母（招待済みの孫）のみ ----

photoRoutes.get("/photos/:id/file", async (c) => {
  const photo = await findPhoto(c.env.DB, Number(c.req.param("id")));
  if (!photo) return c.notFound();

  const user = c.var.user;
  let allowed = false;
  if (user.userType === "parent") {
    const child = await findChild(c.env.DB, photo.child_id);
    allowed = child?.user_id === user.userId;
  } else if (user.userType === "grandparent") {
    allowed = await grandparentHasChild(c.env.DB, user.userId, photo.child_id);
  }
  if (!allowed) return c.notFound(); // 存在の有無も漏らさない

  const object = await c.env.PHOTOS.get(photo.r2_key);
  if (!object) return c.notFound();

  return new Response(object.body, {
    headers: {
      "Content-Type": photo.content_type,
      "Content-Length": String(object.size),
      // 認可付き配信なので共有キャッシュには載せない
      "Cache-Control": "private, max-age=3600",
      ETag: object.httpEtag,
    },
  });
});
