// 祖父母向け: 記念品カタログ・注文フォーム・注文履歴
// （docs/screen-design-mock/grandparent-souvenirs.html を簡略化して踏襲）。
import type { FC } from "hono/jsx";
import type { ChildRow, OrderStatus, SouvenirOrderListRow, SouvenirRow } from "../lib/db";
import { FormErrors, formatDateTime, formatPrice } from "./layout";

// 注文ステータスの日本語表示（祖父母・管理者画面で共用）
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "受付済み",
  processing: "制作中",
  shipped: "発送済み",
  delivered: "お届け完了",
  cancelled: "キャンセル",
};

export const OrderStatusTag: FC<{ status: OrderStatus }> = ({ status }) => (
  <span class={`tag tag-order-${status}`}>{ORDER_STATUS_LABELS[status]}</span>
);

const SouvenirImage: FC<{ souvenir: SouvenirRow }> = ({ souvenir }) =>
  souvenir.image_r2_key ? (
    <img
      src={`/souvenirs/${souvenir.id}/image`}
      alt={`${souvenir.name}の写真`}
      class="souvenir-image"
    />
  ) : (
    <div class="souvenir-image souvenir-image-placeholder" aria-hidden="true">
      🎁
    </div>
  );

export const GrandparentSouvenirsPage: FC<{ souvenirs: SouvenirRow[] }> = ({ souvenirs }) => (
  <>
    <a href="/grandparent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>🎁 記念品のご案内</h1>
    <p class="page-lead">
      お孫さんの写真からイラストを制作し、そのイラスト入りの記念品をお作りしてお届けします。
    </p>
    <p>
      <a href="/grandparent/orders" class="btn btn-secondary">
        📦 注文の履歴を見る
      </a>
    </p>

    {souvenirs.length === 0 ? (
      <div class="card">
        <p class="card-sub">ただいま準備中です。もうしばらくお待ちください。</p>
      </div>
    ) : (
      <div class="card-grid">
        {souvenirs.map((souvenir) => (
          <div class="card souvenir-card">
            <SouvenirImage souvenir={souvenir} />
            <h3>{souvenir.name}</h3>
            <p class="item-price">{formatPrice(souvenir.price)}（税込）</p>
            {souvenir.description && <p class="card-sub">{souvenir.description}</p>}
            <div class="card-actions">
              <a href={`/grandparent/souvenirs/${souvenir.id}/order`} class="btn btn-primary btn-lg">
                この記念品を注文する
              </a>
            </div>
          </div>
        ))}
      </div>
    )}

    <details class="guide">
      <summary>記念品ができるまで</summary>
      <ol>
        <li>ほしい記念品の「この記念品を注文する」ボタンを押します</li>
        <li>どのお孫さんのイラストにするかと、お届け先を入力します</li>
        <li>お孫さんの写真からプロがイラストを制作します</li>
        <li>イラスト入りの記念品をお作りして、ご指定の住所にお届けします（通常2〜3週間）</li>
      </ol>
      <p>お支払いは商品のお届け時にお願いしています（代金引換）。</p>
    </details>
  </>
);

export type OrderFormValues = {
  child_id: string;
  recipient_name: string;
  shipping_address: string;
  contact_phone: string;
};

export const SouvenirOrderFormPage: FC<{
  souvenir: SouvenirRow;
  grandchildren: ChildRow[];
  values: OrderFormValues;
  errors: string[];
}> = ({ souvenir, grandchildren, values, errors }) => (
  <>
    <a href="/grandparent/souvenirs" class="back-link">← 記念品のご案内に戻る</a>
    <h1>記念品の注文</h1>

    <div class="card souvenir-card">
      <SouvenirImage souvenir={souvenir} />
      <h3>{souvenir.name}</h3>
      <p class="item-price">{formatPrice(souvenir.price)}（税込）</p>
      {souvenir.description && <p class="card-sub">{souvenir.description}</p>}
    </div>

    {grandchildren.length === 0 ? (
      <div class="card">
        <p class="card-sub">
          お孫さんが登録されていないため、注文できません。
          親御さんから届く「招待リンク」を先に開いてください。
        </p>
      </div>
    ) : (
      <div class="card">
        <FormErrors errors={errors} />
        <form
          action={`/grandparent/souvenirs/${souvenir.id}/order`}
          method="post"
          data-confirm={`「${souvenir.name}」を注文します。よろしいですか？`}
        >
          <div class="form-group">
            <label for="child_id">どのお孫さんのイラストにしますか？</label>
            <select id="child_id" name="child_id" required>
              {grandchildren.map((child) => (
                <option value={String(child.id)} selected={values.child_id === String(child.id)}>
                  {child.name}さん
                </option>
              ))}
            </select>
          </div>
          <div class="form-group">
            <label for="recipient_name">お届け先のお名前</label>
            <input
              type="text"
              id="recipient_name"
              name="recipient_name"
              value={values.recipient_name}
              required
            />
          </div>
          <div class="form-group">
            <label for="shipping_address">お届け先の住所</label>
            {/* textarea 内は改行を入れると値に混ざるため1行で書く */}
            <textarea id="shipping_address" name="shipping_address" required>{values.shipping_address}</textarea>
            <p class="form-hint">例: 〒100-0001 東京都千代田区千代田1-1 まごころマンション101</p>
          </div>
          <div class="form-group">
            <label for="contact_phone">お電話番号（任意）</label>
            <input type="tel" id="contact_phone" name="contact_phone" value={values.contact_phone} />
            <p class="form-hint">お届けについてご連絡が必要な場合に使います</p>
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            この内容で注文する
          </button>
        </form>
      </div>
    )}

    <details class="guide">
      <summary>注文のしかた</summary>
      <ol>
        <li>イラストにするお孫さんを選びます</li>
        <li>お届け先のお名前と住所を入力します</li>
        <li>「この内容で注文する」ボタンを押すと注文が完了します</li>
      </ol>
    </details>
  </>
);

export const GrandparentOrdersPage: FC<{ orders: SouvenirOrderListRow[] }> = ({ orders }) => (
  <>
    <a href="/grandparent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>📦 注文の履歴</h1>

    {orders.length === 0 ? (
      <div class="card">
        <p class="card-sub">まだ注文はありません。</p>
      </div>
    ) : (
      <ul class="item-list">
        {orders.map((order) => (
          <li class="card">
            <div class="item-head">
              <h3>{order.souvenir_name}</h3>
              <OrderStatusTag status={order.status} />
            </div>
            <p class="item-meta">
              {order.child_name}さんのイラスト ・{" "}
              <span class="item-price">{formatPrice(order.souvenir_price)}</span>
            </p>
            <p class="item-meta">
              お届け先: {order.recipient_name}様 / {order.shipping_address}
            </p>
            <p class="item-meta">注文日時: {formatDateTime(order.created_at)}</p>
          </li>
        ))}
      </ul>
    )}

    <details class="guide">
      <summary>状況の見かた</summary>
      <ul>
        <li>「受付済み」: ご注文をお預かりしました</li>
        <li>「制作中」: イラストと記念品をお作りしています</li>
        <li>「発送済み」: 記念品を発送しました。まもなくお届けします</li>
        <li>「お届け完了」: お届けが完了しました</li>
      </ul>
    </details>
  </>
);
