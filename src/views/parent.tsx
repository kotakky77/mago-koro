import type { FC } from "hono/jsx";
import type { ChildRow } from "../lib/db";
import { FormErrors, ageFrom, formatDate } from "./layout";

export type ChildSummary = ChildRow & { photoCount: number; wishlistCount: number };

export const ParentDashboard: FC<{ userName: string; children_: ChildSummary[] }> = ({
  userName,
  children_,
}) => (
  <>
    <h1>{userName}さんのマイページ</h1>
    <p class="page-lead">お子さんごとに写真・ほしいものリスト・招待を管理できます。</p>

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
        <div class="card-grid">
          {children_.map((child) => (
            <div class="card">
              <h3>{child.name}</h3>
              <p class="card-sub">
                {child.birthdate
                  ? `${formatDate(child.birthdate)}生まれ（${ageFrom(child.birthdate)}）`
                  : "誕生日 未登録"}
              </p>
              <p class="card-sub">
                📷 写真 {child.photoCount}枚 ・ 🎈 ほしいもの {child.wishlistCount}件
              </p>
              <div class="card-actions">
                <a href={`/children/${child.id}/photos`} class="btn btn-primary">
                  写真
                </a>
                <a href={`/children/${child.id}/wishlist_items`} class="btn btn-secondary">
                  ほしいもの
                </a>
                <a href={`/children/${child.id}/invitations`} class="btn btn-outline">
                  招待
                </a>
                <a href={`/children/${child.id}/edit`} class="btn btn-outline">
                  編集
                </a>
              </div>
            </div>
          ))}
        </div>
        <a href="/children/new" class="btn btn-outline">
          ＋ お子さんを追加する
        </a>
      </>
    )}
  </>
);

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
