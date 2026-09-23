import type { FC } from "hono/jsx";
import type { ChildRow, PhotoRow, WishlistItemRow } from "../lib/db";
import { ageFrom, formatDate } from "./layout";
import { ChildHero, Countdown, CountdownChip, OnegaiCard, sortForOnegai } from "./onegai";
import { PhotoGallery } from "./photos";

export type GrandchildSummary = ChildRow & { photoId: number | null };

export const GrandparentDashboard: FC<{ userName: string; grandchildren: GrandchildSummary[] }> = ({
  userName,
  grandchildren,
}) => {
  const now = new Date();
  return (
    <>
      <h1>{userName}さんのマイページ</h1>

      {grandchildren.length === 0 ? (
        <div class="card">
          <h3>まだお孫さんが登録されていません</h3>
          <p class="card-sub">
            親御さんから届く「招待リンク」を開くと、お孫さんの写真やほしいものが
            見られるようになります。招待リンクについては親御さんにお尋ねください。
          </p>
        </div>
      ) : (
        <>
          <p class="page-lead">お孫さんの「ほしいもの」を見て、おくりものを選べます。</p>
          {grandchildren.map((child) => (
            <section class="child-panel">
              <div class="child-panel-head">
                <ChildHero name={child.name} photoId={child.photoId} small />
                <div>
                  <h2>{child.name}さん</h2>
                  {child.birthdate && (
                    <p>
                      {formatDate(child.birthdate)}生まれ（{ageFrom(child.birthdate)}）
                    </p>
                  )}
                  <CountdownChip birthdate={child.birthdate} now={now} />
                </div>
              </div>
              <div class="child-panel-body">
                <div class="panel-actions" style="margin-top:0">
                  <a
                    href={`/grandparent/wishlist_items?child_id=${child.id}`}
                    class="btn btn-primary btn-lg"
                  >
                    🎈 ほしいものを見る
                  </a>
                  <a
                    href={`/grandparent/photos?child_id=${child.id}`}
                    class="btn btn-outline btn-lg"
                  >
                    📷 写真を見る
                  </a>
                </div>
              </div>
            </section>
          ))}

          {/* 記念品は孫を選んで注文する作りなので、孫カードとは別に1枚だけ置く */}
          <div class="card">
            <h3>🎁 記念品をおくる</h3>
            <p class="card-sub">
              お孫さんの写真からイラストを制作し、そのイラスト入りのマグカップや
              Tシャツをお作りしてお届けします。
            </p>
            <div class="card-actions">
              <a href="/grandparent/souvenirs" class="btn btn-outline btn-lg">
                🎁 記念品を見る
              </a>
              <a href="/grandparent/orders" class="btn btn-quiet">
                📦 注文の履歴
              </a>
            </div>
          </div>
        </>
      )}

      <details class="guide">
        <summary>使い方</summary>
        <ul>
          <li>「ほしいものを見る」を押すと、お孫さんがほしいものの一覧が見られます</li>
          <li>贈るものを決めたら「これを贈ります」を押してください。ほかの方と重ならなくなります</li>
          <li>プレゼントを買ったら「購入したことを知らせる」ボタンで親御さんにお知らせできます</li>
          <li>「写真を見る」を押すと、お孫さんの写真が見られます。写真を押すと大きく表示されます</li>
          <li>「記念品を見る」を押すと、お孫さんのイラスト入りの記念品を注文できます</li>
        </ul>
      </details>
    </>
  );
};

// 子ども切り替えタブ（写真・ほしいもの共用）
const ChildTabs: FC<{ basePath: string; children_: ChildRow[]; selected: ChildRow | null }> = ({
  basePath,
  children_,
  selected,
}) =>
  children_.length <= 1 ? (
    <></>
  ) : (
    <nav class="site-nav" style="margin-bottom:16px" aria-label="お孫さんの切り替え">
      {children_.map((child) => (
        <a
          href={`${basePath}?child_id=${child.id}`}
          class={selected?.id === child.id ? "active" : ""}
        >
          {child.name}さん
        </a>
      ))}
    </nav>
  );

export const GrandparentPhotosPage: FC<{
  children_: ChildRow[];
  child: ChildRow | null;
  photos: PhotoRow[];
}> = ({ children_, child, photos }) => (
  <>
    <a href="/grandparent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child ? `${child.name}さんの写真` : "写真を見る"}</h1>
    <ChildTabs basePath="/grandparent/photos" children_={children_} selected={child} />
    {child === null ? (
      <div class="card">
        <p class="card-sub">まだお孫さんが登録されていません。</p>
      </div>
    ) : (
      <>
        <p class="page-lead">
          写真を押すと大きく表示されます。大きく表示したあとは、左右の「‹ ›」ボタンで
          前後の写真に移れます。
        </p>
        <PhotoGallery photos={photos} canDelete={false} childName={child.name} />
      </>
    )}
  </>
);

export const GrandparentWishlistPage: FC<{
  children_: ChildRow[];
  child: ChildRow | null;
  items: WishlistItemRow[];
  /** 見ている祖父母自身のID。自分がおさえた品かどうかの判定に使う */
  viewerId: number;
  /** 孫の代表写真（いちばん新しい1枚） */
  photoId: number | null;
  /** 親が「祖父母にどう見えるか」を確かめるときは、ボタンを押せないようにする */
  preview?: boolean;
}> = ({ children_, child, items, viewerId, photoId, preview }) => (
  <>
    {preview && child ? (
      <>
        <div class="preview-banner">
          👀 おじいちゃん・おばあちゃんには、このように見えています（ボタンは押せません）
        </div>
        <a href={`/children/${child.id}/wishlist_items`} class="back-link">
          ← ほしいものリストに戻る
        </a>
      </>
    ) : (
      <a href="/grandparent/dashboard" class="back-link">← マイページに戻る</a>
    )}
    {!preview && (
      <ChildTabs basePath="/grandparent/wishlist_items" children_={children_} selected={child} />
    )}
    {child === null ? (
      <>
        <h1>ほしいものを見る</h1>
        <div class="card">
          <p class="card-sub">まだお孫さんが登録されていません。</p>
        </div>
      </>
    ) : (
      <>
        <Countdown name={child.name} birthdate={child.birthdate} now={new Date()} />

        <section class="letter">
          <div class="letter-head">
            <ChildHero name={child.name} photoId={photoId} />
            <div>
              <h1 class="letter-to">おじいちゃん、おばあちゃんへ</h1>
              <p class="letter-body">
                {child.name}さんが いま ほしいものを まとめました。
                <br />
                おくりものを えらぶときの 手がかりにしてください。
              </p>
            </div>
          </div>
          <ol class="steps" aria-label="おくりものの流れ">
            <li>ほしいものを えらぶ</li>
            <li>「これを贈ります」を押す</li>
            <li>買ったら お知らせする</li>
          </ol>
        </section>

        {items.length === 0 ? (
          <div class="card">
            <p class="card-sub">まだほしいものが登録されていません。</p>
          </div>
        ) : (
          <fieldset class="onegai-fieldset" disabled={preview === true}>
            <ul class="onegai-list">
              {sortForOnegai(items).map((item, i) => (
                <OnegaiCard item={item} no={i + 1} childName={child.name}>
                  <GrandparentItemActions item={item} viewerId={viewerId} />
                </OnegaiCard>
              ))}
            </ul>
          </fieldset>
        )}

        <details class="guide">
          <summary>使い方</summary>
          <ul>
            <li>
              贈るものを決めたら、まず「これを贈ります」を押してください。
              ほかの方に「もう決まっている」と伝わり、同じものが重ならないようになります
            </li>
            <li>気が変わったら「贈る予定を取り消す」で元に戻せます</li>
            <li>買ったあとに「購入したことを知らせる」を押すと、親御さんにお知らせが届きます</li>
          </ul>
        </details>

        {!preview && (
          <nav class="subnav" aria-label="ほかのページ">
            <a href={`/grandparent/photos?child_id=${child.id}`}>
              <span class="icon" aria-hidden="true">📷</span>
              <span>
                写真を見る<small>{child.name}さんの写真</small>
              </span>
            </a>
            <a href="/grandparent/souvenirs">
              <span class="icon" aria-hidden="true">🎁</span>
              <span>
                記念品をおくる<small>イラスト入りのマグカップなど</small>
              </span>
            </a>
          </nav>
        )}
      </>
    )}
  </>
);

/** 祖父母が押すボタン。ボタン名は 9/19 にご両親が覚えたものから変えない */
const GrandparentItemActions: FC<{ item: WishlistItemRow; viewerId: number }> = ({
  item,
  viewerId,
}) => {
  if (item.purchased) {
    return <p class="given-note">✓ おくりもの済みです。ありがとうございました</p>;
  }
  const mine = item.reserved_by_id === viewerId;
  const others = item.reserved_by_id !== null && !mine;
  if (others) {
    return (
      <div class="onegai-actions">
        <span class="ribbon-label">🎀 {item.reserved_by_name}さんが贈る予定です</span>
      </div>
    );
  }
  return (
    <>
      <div class="onegai-actions">
        {mine ? (
          <>
            <span class="ribbon-label">🎀 あなたが贈る予定です</span>
            {/* 押し間違いは前提なので必ず逃げ道を置く */}
            <form
              action={`/wishlist_items/${item.id}/unreserve`}
              method="post"
              data-confirm={`「${item.name}」を贈る予定を取り消します。よろしいですか？`}
            >
              <button type="submit" class="btn btn-quiet">
                贈る予定を取り消す
              </button>
            </form>
          </>
        ) : (
          <>
            <form action={`/wishlist_items/${item.id}/reserve`} method="post">
              <button type="submit" class="btn btn-primary btn-lg">
                🎀 これを贈ります
              </button>
            </form>
            <p class="onegai-note">押すと、ほかの方と 重ならないように なります</p>
          </>
        )}
      </div>

      {/* 購入報告。自分が贈る予定の品は開いておき、まだの品は畳んで控えめにする */}
      <details class="report" open={mine}>
        <summary>
          {mine ? "買ったら こちら（購入したことを知らせる）" : "もう買った方は こちら（購入したことを知らせる）"}
        </summary>
        <form
          action={`/wishlist_items/${item.id}/purchase`}
          method="post"
          data-confirm={`「${item.name}」を購入したことを親御さんに知らせます。よろしいですか？`}
        >
          <div class="form-group">
            <label for={`message-${item.id}`}>メッセージ（任意）</label>
            <textarea
              id={`message-${item.id}`}
              name="message"
              placeholder="例: お誕生日に贈ります"
            ></textarea>
          </div>
          <button type="submit" class={mine ? "btn btn-primary btn-lg" : "btn btn-outline"}>
            購入したことを知らせる
          </button>
        </form>
      </details>
    </>
  );
};
