// 誕生日お知らせメールの日付計算。Cronから使うので、DBに触らない純粋関数だけを置く。
// （テスト方針: .claude/rules/testing.md — 純粋関数はVitestで、結合はwrangler dev+curlで）

/** 何日前に送るか。kind は送信ログの一意キーの一部になる */
export const BIRTHDAY_NOTICE_DAYS = { d14: 14, d7: 7 } as const;
export type BirthdayNoticeKind = keyof typeof BIRTHDAY_NOTICE_DAYS;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTCの瞬間を、JSTでの暦日 "YYYY-MM-DD" にする */
export function jstYmd(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" に日数を足す。年・月の跨ぎは Date に任せる */
export function shiftYmd(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export type BirthdayTarget = {
  kind: BirthdayNoticeKind;
  /** 送信対象の誕生日そのものの日付 "YYYY-MM-DD"（年は今年or来年） */
  targetYmd: string;
  /** 突き合わせる月日 "MM-DD"。うるう日の救済で2件になることがある */
  monthDays: string[];
};

/**
 * 「今日からN日後の月日」を求めて、その月日が誕生日の子を探すための条件を返す。
 *
 * ⚠️ 逆向き（誕生日にN日を足して今日と比べる）にしてはいけない。
 * 12/30 + 14日 = 1/13 のような年跨ぎで壊れる。こちらの向きなら Date が吸収してくれる。
 */
export function birthdayNoticeTargets(now: Date): BirthdayTarget[] {
  const today = jstYmd(now);
  return (Object.keys(BIRTHDAY_NOTICE_DAYS) as BirthdayNoticeKind[]).map((kind) => {
    const targetYmd = shiftYmd(today, BIRTHDAY_NOTICE_DAYS[kind]);
    const monthDays = [targetYmd.slice(5)];
    // 2月29日生まれは、平年だと一生通知が飛ばない。3月1日の回で拾う
    if (monthDays[0] === "03-01" && !isLeapYear(Number(targetYmd.slice(0, 4)))) {
      monthDays.push("02-29");
    }
    return { kind, targetYmd, monthDays };
  });
}

/** その誕生日で何歳になるか */
export function upcomingAge(birthdate: string, targetYmd: string): number {
  return Number(targetYmd.slice(0, 4)) - Number(birthdate.slice(0, 4));
}

/** "10-09" → "10月9日" */
export function formatMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split("-");
  return `${Number(m)}月${Number(d)}日`;
}
