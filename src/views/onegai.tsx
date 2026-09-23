// 「孫からのおねがい帳」の部品（2026-09 リニューアル）。
// 祖父母の画面と親の画面で同じ見た目を使い回す（親は「祖父母にどう見えるか」を確かめられる）。
import type { Child, FC } from "hono/jsx";
import { birthdayCountdown } from "../lib/birthday";
import type { WishlistItemRow } from "../lib/db";
import { formatPrice } from "./layout";

/** 「あと◯日」の文言。当日は「今日がお誕生日」 */
function daysText(days: number): string {
  return days === 0 ? "今日がお誕生日です" : `お誕生日まで あと${days}日`;
}

/** 大きなカウントダウンの帯（祖父母の「ほしいもの」の一番上） */
export const Countdown: FC<{ name: string; birthdate: string | null; now: Date }> = ({
  name,
  birthdate,
  now,
}) => {
  if (!birthdate) return <></>;
  const c = birthdayCountdown(birthdate, now);
  return (
    <section class="countdown" aria-label="お誕生日まで">
      <div class="countdown-icon" aria-hidden="true">
        🎂
      </div>
      <div>
        {c.days === 0 ? (
          <p class="countdown-days">今日は {name}さんのお誕生日です</p>
        ) : (
          <>
            <p class="countdown-label">{name}さんのお誕生日まで</p>
            <p class="countdown-days">
              あと<strong>{c.days}</strong>日
            </p>
          </>
        )}
        <p class="countdown-sub">
          {c.birthdayText}で {c.age}歳になります
        </p>
      </div>
    </section>
  );
};

/** 小さいカウントダウン（マイページのカード内） */
export const CountdownChip: FC<{ birthdate: string | null; now: Date }> = ({ birthdate, now }) => {
  if (!birthdate) return <></>;
  const c = birthdayCountdown(birthdate, now);
  return <span class="chip">🎂 {daysText(c.days)}</span>;
};

/** 孫の丸い写真。写真がなければ名前の頭文字 */
export const ChildHero: FC<{ name: string; photoId: number | null; small?: boolean }> = ({
  name,
  photoId,
  small,
}) => (
  <div class={small ? "child-hero sm" : "child-hero"}>
    {photoId !== null ? (
      <img src={`/photos/${photoId}/file`} alt={`${name}さんの写真`} />
    ) : (
      <span aria-hidden="true">{name.slice(0, 1)}</span>
    )}
  </div>
);

/** 蝶結び（贈る予定の品のカード右上） */
const Bow: FC = () => (
  <svg class="bow" viewBox="0 0 88 56" aria-hidden="true">
    <path d="M44 26C30 4 6 6 10 22c3 12 22 10 34 4z" fill="#a8323e" />
    <path d="M44 26C58 4 82 6 78 22c-3 12-22 10-34 4z" fill="#a8323e" />
    <path d="M40 28l-10 26 8-4 6 6 2-28zM48 28l10 26-8-4-6 6-2-28z" fill="#8c2632" />
    <circle cx="44" cy="27" r="7" fill="#c24a55" />
  </svg>
);

/** 未購入を先に、贈った品を後ろに並べる（元の並び順は保つ） */
export function sortForOnegai(items: WishlistItemRow[]): WishlistItemRow[] {
  return [...items].sort((a, b) => a.purchased - b.purchased);
}

/**
 * おねがいカード1枚。状態（まだ/贈る予定/贈った）で見た目が変わる。
 * 操作ボタンは画面ごとに違うので children で受け取る。
 */
export const OnegaiCard: FC<{
  item: WishlistItemRow;
  no: number;
  childName: string;
  /** 親の画面では、ひとことが空のときに催促を出す */
  nudgeEmptyMessage?: boolean;
  children?: Child;
}> = ({ item, no, childName, nudgeEmptyMessage, children }) => {
  const given = item.purchased === 1;
  const reserved = !given && item.reserved_by_id !== null;
  const cls = given ? "onegai-card is-given" : reserved ? "onegai-card is-reserved" : "onegai-card";
  return (
    <li class={cls}>
      {reserved && <Bow />}
      {given && (
        <div class="stamp" aria-hidden="true">
          <strong>贈</strong>ありがとう
        </div>
      )}
      <p class="onegai-no">おねがい その{no}</p>
      <h2>{item.name}</h2>
      <p class="onegai-meta">
        {item.url !== "" ? (
          <span>
            🔗{" "}
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              商品ページを見る ↗
            </a>
          </span>
        ) : (
          <span>🏬 商品の指定はありません。お店で選んでください</span>
        )}
        {item.category && <span>{item.category}</span>}
        {item.quantity > 1 && <span>{item.quantity}個</span>}
        {item.price !== null && <span class="price">{formatPrice(item.price)}</span>}
      </p>
      {item.description ? (
        <p class="speech">
          {item.description}
          <span class="speech-from">— {childName}より</span>
        </p>
      ) : (
        nudgeEmptyMessage && (
          <p class="speech-empty">
            💡 {childName}さんの「ひとこと」がまだありません。「編集」から書けます
          </p>
        )
      )}
      {children}
    </li>
  );
};
