// Cronで動く仕事。いまは誕生日お知らせメールだけ。
// 日付の計算は lib/birthday.ts（純粋関数・テストあり）に寄せて、ここは繋ぎに徹する。

import {
  BIRTHDAY_NOTICE_DAYS,
  birthdayNoticeTargets,
  formatMonthDay,
  jstYmd,
  upcomingAge,
} from "./lib/birthday";
import {
  claimBirthdayNotification,
  listBirthdayRecipients,
  releaseBirthdayNotification,
} from "./lib/db";
import { buildMimeMessage, getGmailAccessToken, sendGmail } from "./lib/gmail";
import { birthdayNoticeMail } from "./lib/mail-templates";
import type { Env } from "./types";

export type BirthdayNoticeResult = { sent: number; skipped: number; failed: number };

export async function sendBirthdayNotices(env: Env, now: Date): Promise<BirthdayNoticeResult> {
  const result: BirthdayNoticeResult = { sent: 0, skipped: 0, failed: 0 };
  const sentOn = jstYmd(now);
  const targets = birthdayNoticeTargets(now);

  // 宛先が1件も無い日が大半なので、先に確かめてからGmailの認証を取る
  const work: { target: (typeof targets)[number]; recipients: Awaited<ReturnType<typeof listBirthdayRecipients>> }[] = [];
  for (const target of targets) {
    const recipients = await listBirthdayRecipients(env.DB, target.monthDays);
    if (recipients.length > 0) work.push({ target, recipients });
  }
  if (work.length === 0) return result;

  const accessToken = await getGmailAccessToken({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
  });

  for (const { target, recipients } of work) {
    for (const r of recipients) {
      const key = {
        childId: r.child_id,
        grandparentId: r.grandparent_id,
        kind: target.kind,
        sentOn,
      };
      // 送信の前に席を取る。取れなければ今日はもう送った回
      if (!(await claimBirthdayNotification(env.DB, key))) {
        result.skipped += 1;
        continue;
      }
      try {
        const mail = birthdayNoticeMail({
          grandparentName: r.grandparent_name,
          childName: r.child_name,
          age: upcomingAge(r.birthdate, target.targetYmd),
          birthdayText: formatMonthDay(r.birthdate.slice(5)),
          daysBefore: BIRTHDAY_NOTICE_DAYS[target.kind],
          wishlistUrl: `${env.APP_BASE_URL}/grandparent/wishlist_items?child_id=${r.child_id}`,
        });
        await sendGmail(
          accessToken,
          buildMimeMessage({
            from: env.GMAIL_FROM,
            to: r.grandparent_email,
            subject: mail.subject,
            body: mail.body,
          }),
        );
        result.sent += 1;
      } catch (e) {
        // 送れなかったら席を戻す。Cronの再試行で拾い直せるようにするため
        await releaseBirthdayNotification(env.DB, key);
        result.failed += 1;
        console.error("birthday notice failed", { ...key, error: String(e) });
      }
    }
  }
  return result;
}
