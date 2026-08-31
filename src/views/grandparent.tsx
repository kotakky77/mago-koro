import type { FC } from "hono/jsx";
import type { ChildRow, PhotoRow, WishlistItemRow } from "../lib/db";
import { ageFrom, formatDate, formatPrice } from "./layout";
import { PhotoGallery } from "./photos";

export const GrandparentDashboard: FC<{ userName: string; grandchildren: ChildRow[] }> = ({
  userName,
  grandchildren,
}) => (
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
        <p class="page-lead">見たいものを選んでください。</p>
        <div class="card-grid">
          {grandchildren.map((child) => (
            <div class="card">
              <h3>{child.name}さん</h3>
              <p class="card-sub">
                {child.birthdate
                  ? `${formatDate(child.birthdate)}生まれ（${ageFrom(child.birthdate)}）`
                  : ""}
              </p>
              <div class="card-actions">
                <a href={`/grandparent/photos?child_id=${child.id}`} class="btn btn-primary btn-lg">
                  📷 写真を見る
                </a>
                <a
                  href={`/grandparent/wishlist_items?child_id=${child.id}`}
                  class="btn btn-secondary btn-lg"
                >
                  🎈 ほしいものを見る
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 記念品は孫を選んで注文する作りなので、孫カードとは別に1枚だけ置く */}
        <div class="card">
          <h3>🎁 記念品をおくる</h3>
          <p class="card-sub">
            お孫さんの写真からイラストを制作し、そのイラスト入りのマグカップや
            Tシャツをお作りしてお届けします。
          </p>
          <div class="card-actions">
            <a href="/grandparent/souvenirs" class="btn btn-primary btn-lg">
              🎁 記念品を見る
            </a>
            <a href="/grandparent/orders" class="btn btn-secondary">
              📦 注文の履歴
            </a>
          </div>
        </div>
      </>
    )}

    <details class="guide">
      <summary>使い方</summary>
      <ul>
        <li>「写真を見る」を押すと、お孫さんの写真が見られます。写真を押すと大きく表示されます</li>
        <li>「ほしいものを見る」を押すと、お孫さんがほしいものの一覧が見られます</li>
        <li>プレゼントを買ったら「購入したことを知らせる」ボタンで親御さんにお知らせできます</li>
        <li>「記念品を見る」を押すと、お孫さんのイラスト入りの記念品を注文できます</li>
      </ul>
    </details>
  </>
);

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
}> = ({ children_, child, items }) => (
  <>
    <a href="/grandparent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child ? `${child.name}さんのほしいもの` : "ほしいものを見る"}</h1>
    <ChildTabs basePath="/grandparent/wishlist_items" children_={children_} selected={child} />
    {child === null ? (
      <div class="card">
        <p class="card-sub">まだお孫さんが登録されていません。</p>
      </div>
    ) : items.length === 0 ? (
      <div class="card">
        <p class="card-sub">まだほしいものが登録されていません。</p>
      </div>
    ) : (
      <>
        <p class="page-lead">
          プレゼントを買ったら「購入したことを知らせる」ボタンを押してください。
          親御さんにお知らせが届き、同じものが重ならないようになります。
        </p>
        <ul class="item-list">
          {items.map((item) => (
            <li class="card">
              <div class="item-head">
                <h3>{item.name}</h3>
                {item.purchased ? (
                  <span class="tag tag-purchased">購入済み</span>
                ) : (
                  <span class="tag tag-pending">ほしいもの</span>
                )}
              </div>
              <p class="item-meta">
                {item.category && <>{item.category} ・ </>}
                数量: {item.quantity}
                {item.price !== null && (
                  <>
                    {" "}
                    ・ <span class="item-price">{formatPrice(item.price)}</span>
                  </>
                )}
              </p>
              {item.description && <p>{item.description}</p>}
              <p class="item-meta">
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  商品ページを見る ↗
                </a>
              </p>
              {!item.purchased && (
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
                  <button type="submit" class="btn btn-primary btn-lg">
                    購入したことを知らせる
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </>
    )}
  </>
);
