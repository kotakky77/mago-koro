// フラッシュメッセージ。Rails ではセッションに載っていたが、
// Workers 版は「次のリクエストで1回だけ表示して消える」Cookie で実現する。
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

export type Flash = { notice?: string; alert?: string };

const COOKIE_NAME = "flash";

export function setFlash(c: Context, flash: Flash): void {
  setCookie(c, COOKIE_NAME, encodeURIComponent(JSON.stringify(flash)), {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 60,
  });
}

// 読み出しと同時に削除する（1回表示したら消える）
export function takeFlash(c: Context): Flash {
  const raw = getCookie(c, COOKIE_NAME);
  if (!raw) return {};
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return {
      notice: typeof parsed.notice === "string" ? parsed.notice : undefined,
      alert: typeof parsed.alert === "string" ? parsed.alert : undefined,
    };
  } catch {
    return {};
  }
}
