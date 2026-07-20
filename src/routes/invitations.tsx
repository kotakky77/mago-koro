// 招待機能（Rails: InvitationsController 相当）。
// - 親向け管理（発行・無効化）: inviteManageRoutes（要ログイン+親ロール）
// - 受諾・祖父母登録: invitePublicRoutes（未ログインでアクセス可能）
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { AppEnv } from "../app-env";
import { SESSION_COOKIE, clientIp } from "../app-env";
import { createSession, createUser, generateToken, validateNewUser } from "../lib/auth";
import {
  acceptInvitation,
  createInvitation,
  expireInvitation,
  findChild,
  findInvitation,
  findInvitationByToken,
  invitationExpired,
  listInvitations,
} from "../lib/db";
import { setFlash } from "../lib/flash";
import { deniedRedirect, loadOwnChild, requireParent } from "./children";
import { InvitationsPage, InviteAcceptPage } from "../views/invitations";
import { renderPage } from "../views/layout";

// ---- 親向け管理 ----

export const inviteManageRoutes = new Hono<AppEnv>();

// "*" は後続の祖父母ルートまで巻き込むため、対象パスに限定して掛ける
inviteManageRoutes.use("/children/*", requireParent());
inviteManageRoutes.use("/invitations/*", requireParent());

inviteManageRoutes.get("/children/:id/invitations", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  const invitations = await listInvitations(c.env.DB, child.id);
  return renderPage(
    c,
    { title: `${child.name}さんの招待`, user: c.var.user },
    <InvitationsPage
      child={child}
      invitations={invitations}
      origin={new URL(c.req.url).origin}
    />,
  );
});

inviteManageRoutes.post("/children/:id/invitations", async (c) => {
  const child = await loadOwnChild(c, Number(c.req.param("id")));
  if (!child) return deniedRedirect(c);
  // 招待トークン: 128bit ランダム（Rails: SecureRandom.urlsafe_base64(16) 相当）
  await createInvitation(c.env.DB, generateToken(16), c.var.user.userId, child.id);
  setFlash(c, { notice: "招待リンクを作成しました" });
  return c.redirect(`/children/${child.id}/invitations`);
});

inviteManageRoutes.post("/invitations/:id/expire", async (c) => {
  const invitation = await findInvitation(c.env.DB, Number(c.req.param("id")));
  if (!invitation) return deniedRedirect(c);
  const child = await loadOwnChild(c, invitation.child_id);
  if (!child) return deniedRedirect(c);
  await expireInvitation(c.env.DB, invitation.id);
  setFlash(c, { notice: "招待を無効化しました" });
  return c.redirect(`/children/${child.id}/invitations`);
});

// ---- 受諾・登録（未ログイン） ----

export const invitePublicRoutes = new Hono<AppEnv>();

// トークンから有効な招待と関連情報を引く。無効なら null
async function loadValidInvitation(c: { env: { DB: D1Database } }, token: string) {
  const invitation = await findInvitationByToken(c.env.DB, token);
  if (!invitation || invitationExpired(invitation)) return null;
  const child = await findChild(c.env.DB, invitation.child_id);
  if (!child) return null;
  const parent = await c.env.DB.prepare("SELECT name FROM users WHERE id = ?")
    .bind(invitation.parent_id)
    .first<{ name: string }>();
  return { invitation, child, parentName: parent?.name ?? "" };
}

invitePublicRoutes.get("/invite/:token", async (c) => {
  const found = await loadValidInvitation(c, c.req.param("token"));
  if (!found) {
    setFlash(c, { alert: "この招待リンクは有効期限が切れているか、既に使用されています" });
    return c.redirect("/");
  }
  return renderPage(
    c,
    { title: "ご招待", user: null },
    <InviteAcceptPage
      token={c.req.param("token")}
      childName={found.child.name}
      parentName={found.parentName}
      errors={[]}
      values={{ name: "", email: "" }}
    />,
  );
});

invitePublicRoutes.post("/invite/:token/register", async (c) => {
  const token = c.req.param("token");
  const found = await loadValidInvitation(c, token);
  if (!found) {
    setFlash(c, { alert: "この招待リンクは有効期限が切れているか、既に使用されています" });
    return c.redirect("/");
  }

  const form = await c.req.parseBody();
  const input = {
    name: typeof form["name"] === "string" ? form["name"] : "",
    email: typeof form["email"] === "string" ? form["email"] : "",
    password: typeof form["password"] === "string" ? form["password"] : "",
    passwordConfirmation:
      typeof form["password_confirmation"] === "string" ? form["password_confirmation"] : "",
  };

  const errors = validateNewUser(input);
  let user = null;
  if (errors.length === 0) {
    user = await createUser(c.env.DB, { ...input, userType: "grandparent" });
    if (!user) errors.push("このメールアドレスは既に登録されています");
  }

  if (!user) {
    return renderPage(
      c,
      { title: "ご招待", user: null, status: 422 },
      <InviteAcceptPage
        token={token}
        childName={found.child.name}
        parentName={found.parentName}
        errors={errors}
        values={{ name: input.name, email: input.email }}
      />,
    );
  }

  await acceptInvitation(c.env.DB, found.invitation.id, user.userId);

  const sessionToken = await createSession(
    c.env.DB,
    user.userId,
    clientIp(c),
    c.req.header("User-Agent") ?? null,
  );
  setCookie(c, SESSION_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 365 * 24 * 60 * 60,
  });

  setFlash(c, {
    notice: `登録が完了しました。${found.child.name}さんのページへようこそ！`,
  });
  return c.redirect("/grandparent/dashboard");
});
