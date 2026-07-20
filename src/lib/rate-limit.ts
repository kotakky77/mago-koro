// ログインのレート制限。Rails の `rate_limit to: 10, within: 3.minutes`（IP単位）の移植。
// Rails では Solid Cache のカウンタだったが、Workers では D1 のテーブルで数える。

export const LOGIN_RATE_LIMIT = { to: 10, withinSeconds: 3 * 60 };

// 制限超過なら true（リクエストを拒否すべき）。
// 判定と同時に今回の試行を記録し、窓の外に出た古い行はついでに掃除する。
export async function loginRateLimited(
  db: D1Database,
  ip: string,
  now: Date = new Date(),
): Promise<boolean> {
  const windowStart = new Date(
    now.getTime() - LOGIN_RATE_LIMIT.withinSeconds * 1000,
  ).toISOString();
  const nowIso = now.toISOString();

  const count = await db
    .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE ip = ? AND attempted_at >= ?")
    .bind(ip, windowStart)
    .first<{ c: number }>();
  if ((count?.c ?? 0) >= LOGIN_RATE_LIMIT.to) return true;

  await db.batch([
    db.prepare("INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)").bind(ip, nowIso),
    db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").bind(windowStart),
  ]);
  return false;
}
