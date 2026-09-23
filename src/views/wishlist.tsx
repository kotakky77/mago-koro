import type { FC } from "hono/jsx";
import type { ChildRow, WishlistItemRow } from "../lib/db";
import { WISHLIST_MAX_PER_CHILD } from "../lib/db";
import { FormErrors, formatDate } from "./layout";
import { OnegaiCard, sortForOnegai } from "./onegai";

export const WishlistIndexPage: FC<{ child: ChildRow; items: WishlistItemRow[] }> = ({
  child,
  items,
}) => (
  <>
    <a href="/parent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child.name}さんのほしいものリスト</h1>
    <p class="page-lead">
      登録した品は、招待したおじいちゃん・おばあちゃんに「おねがい」として表示されます（1人あたり最大
      {WISHLIST_MAX_PER_CHILD}件）。{child.name}さんの「ひとこと」を添えると、選ぶ手がかりになります。
    </p>

    <div class="panel-actions" style="margin:0 0 24px">
      {items.length < WISHLIST_MAX_PER_CHILD && (
        <a href={`/children/${child.id}/wishlist_items/new`} class="btn btn-primary btn-lg">
          ＋ ほしいものを追加する
        </a>
      )}
      <a href={`/children/${child.id}/wishlist_items/preview`} class="btn btn-outline btn-lg">
        👀 おじいちゃんたちの見え方
      </a>
    </div>

    {items.length === 0 ? (
      <div class="card">
        <p class="card-sub">まだ登録されていません。</p>
      </div>
    ) : (
      <ul class="onegai-list">
        {sortForOnegai(items).map((item, i) => (
          <OnegaiCard item={item} no={i + 1} childName={child.name} nudgeEmptyMessage>
            {item.purchased === 1 && (
              <p class="given-note">
                ✓ {item.purchased_at ? `${formatDate(item.purchased_at)}に` : ""}贈られました
              </p>
            )}
            <div class="onegai-actions">
              {/* 事前表明（フェーズ3）。自分たちが同じものを買わないための表示でもある */}
              {item.purchased === 0 && item.reserved_by_id !== null && (
                <span class="ribbon-label">🎀 {item.reserved_by_name}さんが贈る予定</span>
              )}
              <a href={`/wishlist_items/${item.id}/edit`} class="btn btn-outline">
                ✎ 編集
              </a>
              {item.purchased === 0 && item.reserved_by_id !== null && (
                <form
                  action={`/wishlist_items/${item.id}/reserve/clear`}
                  method="post"
                  data-confirm={`「${item.name}」の「贈る予定」を取り消します。よろしいですか？`}
                >
                  <button type="submit" class="btn btn-quiet">
                    贈る予定を取り消す
                  </button>
                </form>
              )}
              <form
                action={`/wishlist_items/${item.id}/delete`}
                method="post"
                data-confirm={`「${item.name}」をリストから削除します。よろしいですか？`}
              >
                <button type="submit" class="btn btn-danger">
                  削除
                </button>
              </form>
            </div>
          </OnegaiCard>
        ))}
      </ul>
    )}
  </>
);

export type WishlistFormValues = {
  name: string;
  url: string;
  price: string;
  description: string;
  category: string;
  quantity: string;
};

export const WishlistFormPage: FC<{
  child: ChildRow;
  errors: string[];
  values: WishlistFormValues;
  itemId?: number;
}> = ({ child, errors, values, itemId }) => {
  const isEdit = itemId !== undefined;
  return (
    <>
      <a href={`/children/${child.id}/wishlist_items`} class="back-link">
        ← ほしいものリストに戻る
      </a>
      <h1>{isEdit ? "ほしいものの編集" : `${child.name}さんのほしいものを追加`}</h1>
      <div class="card form-card">
        <FormErrors errors={errors} />
        <form
          action={isEdit ? `/wishlist_items/${itemId}` : `/children/${child.id}/wishlist_items`}
          method="post"
        >
          <div class="form-group">
            <label for="name">商品名</label>
            <input type="text" id="name" name="name" value={values.name} required />
          </div>
          <div class="form-group">
            <label for="url">商品ページのURL（任意）</label>
            <input type="url" id="url" name="url" value={values.url} />
            <p class="form-hint">
              通販サイトなどの商品ページのアドレスがあれば貼り付けてください。
              商品が決まっていなければ、空のままで構いません
            </p>
          </div>
          <div class="form-group">
            <label for="price">価格（円・任意）</label>
            <input type="number" id="price" name="price" value={values.price} min="0" />
          </div>
          <div class="form-group">
            <label for="category">カテゴリ（任意）</label>
            <input type="text" id="category" name="category" value={values.category} list="categories" />
            <datalist id="categories">
              <option value="おもちゃ" />
              <option value="絵本" />
              <option value="洋服" />
              <option value="文房具" />
              <option value="その他" />
            </datalist>
          </div>
          <div class="form-group">
            <label for="quantity">数量</label>
            <input type="number" id="quantity" name="quantity" value={values.quantity} min="1" required />
          </div>
          <div class="form-group">
            <label for="description">{child.name}さんのひとこと（任意）</label>
            <textarea
              id="description"
              name="description"
              placeholder="例: じいじと いっしょに ウォーキングしたい！"
            >
              {values.description}
            </textarea>
            <p class="form-hint">
              なぜほしいか、どう使いたいか。おじいちゃん・おばあちゃんの画面に
              「{child.name}より」の吹き出しで表示されます。サイズや色の希望もここに書けます
            </p>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            {isEdit ? "保存する" : "追加する"}
          </button>
        </form>
      </div>
    </>
  );
};
