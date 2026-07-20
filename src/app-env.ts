// Honoアプリ全体で共有する型とCookie名。
import type { Context } from "hono";
import type { SessionUser } from "./lib/auth";
import type { Env } from "./types";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    user: SessionUser;
  };
};

export const SESSION_COOKIE = "session_token";
export const RETURN_TO_COOKIE = "return_to";

export function clientIp(c: Context<AppEnv>): string {
  // Cloudflare が付ける実クライアントIP。ローカル開発では付かないことがある
  return c.req.header("CF-Connecting-IP") ?? "local";
}

// ロールごとのダッシュボードURL（Railsの redirect_based_on_user_type 相当）
export function dashboardPath(userType: string): string {
  switch (userType) {
    case "parent":
      return "/parent/dashboard";
    case "grandparent":
      return "/grandparent/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
