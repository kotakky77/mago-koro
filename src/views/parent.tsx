import type { FC } from "hono/jsx";
import type { ChildRow, PurchaseNotificationRow, WishlistItemRow } from "../lib/db";
import { FormErrors, ageFrom, formatDate } from "./layout";
import { ThanksCard } from "./notifications";
import { ChildHero, CountdownChip, sortForOnegai } from "./onegai";

export type ChildSummary = ChildRow & {
  photoCount: number;
  /** 代表写真（いちばん新しい1枚） */
  photoId: number | null;
  items: WishlistItemRow[];
};

/** おくりもの状況の1行ぶんの表示 */
const ItemStatus: FC<{ item: WishlistItemRow }> = ({ item }) =>
  item.purchased === 1 ? (
    <span class="pill pill-given">
      ✓ {item.purchased_at ? `${formatDate(item.purchased_at)}に贈られました` : "贈られました"}
    </span>
  ) : item.reserved_by_id !== null ? (
    <span class="pill pill-reserved">🎀 {item.reserved_by_name}さんが贈る予定</span>
  ) : (
    <span class="pill pill-wish">まだ選ばれていない</span>
  );

export const ParentDashboard: FC<{
  userName: string;
  children_: ChildSummary[];
  latestNotification: PurchaseNotificationRow | null;
}> = ({ userName, children_, latestNotification }) => {
  const now = new Date();
  return (
    <>
      <h1>{userName}さんのマイページ</h1>

      {children_.length === 0 ? (
        <div class="card">
          <h3>まずはお子さんを登録しましょう</h3>
          <p class="card-sub">
            お子さんを登録すると、写真のアップロードやほしいものリストの作成、
            おじいちゃん・おばあちゃんの招待ができるようになります。
          </p>
          <div class="card-actions">
            <a href="/children/new" class="btn btn-primary btn-lg">
              お子さんを登録する
            </a>
          </div>
        </div>
      ) : (
        <>
          <p class="page-lead">おじいちゃん・おばあちゃんの「贈りたい」を、ここで見守れます。</p>
          {children_.map((child) => {
            const given = child.items.filter((i) => i.purchased === 1).length;
            const reserved = child.items.filter(
              (i) => i.purchased === 0 && i.reserved_by_id !== null,
            ).length;
            const open = child.items.length - given - reserved;
            const missingMessage = child.items.some(
              (i) => i.purchased === 0 && !i.description,
            );
            return (
              <section class="child-panel">
                <div class="child-panel-head">
                  <ChildHero name={child.name} photoId={child.photoId} small />
                  <div>
                    <h2>{child.name}さん</h2>
                    <p>
                      {child.birthdate
                        ? `${formatDate(child.birthdate)}生まれ（${ageFrom(child.birthdate)}）`
                        : "誕生日 未登録"}
                    </p>
                    <CountdownChip birthdate={child.birthdate} now={now} />
                  </div>
                </div>

                <div class="child-panel-body">
                  <h3 class="board-title">おくりもの状況</h3>
                  {child.items.length === 0 ? (
                    <p class="card-sub">
                      まだほしいものが登録されていません。「ほしいものリスト」から追加しましょう。
                    </p>
                  ) : (
                    <>
                      <div class="stats">
                        <div class="stat">
                          <p class="stat-label">🎈 まだ選ばれていない</p>
                          <p class="stat-num">
                            {open}
                            <small>件</small>
                          </p>
                        </div>
                        <div class="stat reserved">
                          <p class="stat-label">🎀 贈る予定</p>
                          <p class="stat-num">
                            {reserved}
                            <small>件</small>
                          </p>
                        </div>
                        <div class="stat given">
                          <p class="stat-label">✓ 贈られた</p>
                          <p class="stat-num">
                            {given}
                            <small>件</small>
                          </p>
                        </div>
                      </div>

                      <ul class="mini-list">
                        {sortForOnegai(child.items).map((item) => (
                          <li>
                            <span class="name">
                              {item.name}
                              {item.purchased === 0 && !item.description && (
                                <span class="missing">ひとこと未記入</span>
                              )}
                            </span>
                            <ItemStatus item={item} />
                          </li>
                        ))}
                      </ul>

                      {missingMessage && (
                        <div class="hint">
                          <span aria-hidden="true">💡</span>
                          <p>
                            {child.name}
                            さんの「ひとこと」（なぜほしいか）を書いておくと、おじいちゃん・おばあちゃんが選びやすくなります。
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <div class="panel-actions">
                    <a href={`/children/${child.id}/wishlist_items`} class="btn btn-primary btn-lg">
                      🎈 ほしいものリスト
                    </a>
                    <a
                      href={`/children/${child.id}/wishlist_items/preview`}
                      class="btn btn-outline btn-lg"
                    >
                      👀 おじいちゃんたちの見え方
                    </a>
                  </div>
                  <div class="panel-links">
                    <a href={`/children/${child.id}/photos`}>📷 写真（{child.photoCount}枚）</a>
                    <a href={`/children/${child.id}/invitations`}>✉ 招待</a>
                    <a href={`/children/${child.id}/edit`}>✎ {child.name}さんの情報を編集</a>
                  </div>
                </div>
              </section>
            );
          })}

          {latestNotification && (
            <>
              <h2>ありがとうのお知らせ</h2>
              <ThanksCard notification={latestNotification} />
              <p>
                <a href="/purchase_notifications" class="back-link">
                  すべてのお知らせを見る →
                </a>
              </p>
            </>
          )}

          <p style="margin-top:28px">
            <a href="/children/new" class="btn btn-quiet">
              ＋ お子さんを追加する
            </a>
          </p>
        </>
      )}
    </>
  );
};

export const ChildFormPage: FC<{
  errors: string[];
  child: { id?: number; name: string; birthdate: string };
}> = ({ errors, child }) => {
  const isEdit = child.id !== undefined;
  return (
    <>
      <a href="/parent/dashboard" class="back-link">← マイページに戻る</a>
      <h1>{isEdit ? `${child.name}さんの情報を編集` : "お子さんの登録"}</h1>
      <div class="card form-card">
        <FormErrors errors={errors} />
        <form action={isEdit ? `/children/${child.id}` : "/children"} method="post">
          <div class="form-group">
            <label for="name">お名前</label>
            <input type="text" id="name" name="name" value={child.name} required maxlength={50} />
          </div>
          <div class="form-group">
            <label for="birthdate">誕生日（任意）</label>
            <input type="date" id="birthdate" name="birthdate" value={child.birthdate} />
          </div>
          <button type="submit" class="btn btn-primary btn-lg">
            {isEdit ? "保存する" : "登録する"}
          </button>
        </form>
      </div>
      {isEdit && (
        <div class="card form-card">
          <h3>お子さんの削除</h3>
          <p class="card-sub">
            写真・ほしいものリスト・招待もすべて削除されます。元に戻せません。
          </p>
          <form
            action={`/children/${child.id}/delete`}
            method="post"
            data-confirm={`${child.name}さんの情報をすべて削除します。よろしいですか？`}
          >
            <button type="submit" class="btn btn-danger">
              削除する
            </button>
          </form>
        </div>
      )}
    </>
  );
};
