import type { FC } from "hono/jsx";
import type { ChildRow, WishlistItemRow } from "../lib/db";
import { WISHLIST_MAX_PER_CHILD } from "../lib/db";
import { FormErrors, formatDate, formatPrice } from "./layout";

export const WishlistIndexPage: FC<{ child: ChildRow; items: WishlistItemRow[] }> = ({
  child,
  items,
}) => (
  <>
    <a href="/parent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child.name}さんのほしいものリスト</h1>
    <p class="page-lead">
      登録した商品は、招待したおじいちゃん・おばあちゃんに表示されます（1人あたり最大
      {WISHLIST_MAX_PER_CHILD}件）。
    </p>

    {items.length < WISHLIST_MAX_PER_CHILD && (
      <a href={`/children/${child.id}/wishlist_items/new`} class="btn btn-primary btn-lg">
        ＋ ほしいものを追加する
      </a>
    )}

    {items.length === 0 ? (
      <div class="card" style="margin-top:20px">
        <p class="card-sub">まだ登録されていません。</p>
      </div>
    ) : (
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
              {item.category && <>カテゴリ: {item.category} ・ </>}
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
            {item.purchased === 1 && item.purchased_at && (
              <p class="item-meta">{formatDate(item.purchased_at)}に購入されました</p>
            )}
            <div class="card-actions">
              <a href={`/wishlist_items/${item.id}/edit`} class="btn btn-outline">
                編集
              </a>
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
          </li>
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
            <label for="url">商品ページのURL</label>
            <input type="url" id="url" name="url" value={values.url} required />
            <p class="form-hint">通販サイトなどの商品ページのアドレスを貼り付けてください</p>
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
            <label for="description">メモ（任意）</label>
            <textarea id="description" name="description">
              {values.description}
            </textarea>
            <p class="form-hint">サイズや色の希望などがあれば書いておきましょう</p>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            {isEdit ? "保存する" : "追加する"}
          </button>
        </form>
      </div>
    </>
  );
};
