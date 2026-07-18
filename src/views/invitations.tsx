import type { FC } from "hono/jsx";
import type { ChildRow, InvitationRow } from "../lib/db";
import { invitationExpired } from "../lib/db";
import { FormErrors, formatDate } from "./layout";

const statusTag = (inv: InvitationRow) => {
  if (inv.status === "accepted") return <span class="tag tag-accepted">受諾済み</span>;
  if (invitationExpired(inv)) return <span class="tag tag-expired">無効</span>;
  return <span class="tag tag-pending">招待中</span>;
};

// 親向け: 招待管理ページ（Rails: invitations#index）
export const InvitationsPage: FC<{
  child: ChildRow;
  invitations: InvitationRow[];
  origin: string;
}> = ({ child, invitations, origin }) => (
  <>
    <a href="/parent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child.name}さんの祖父母を招待</h1>
    <p class="page-lead">
      招待リンクを作って、おじいちゃん・おばあちゃんにLINEやメールで送ってください。
      リンクの有効期限は7日間です。
    </p>

    <form action={`/children/${child.id}/invitations`} method="post">
      <button type="submit" class="btn btn-primary btn-lg">
        ＋ 招待リンクを作る
      </button>
    </form>

    {invitations.length === 0 ? (
      <div class="card" style="margin-top:20px">
        <p class="card-sub">まだ招待がありません。</p>
      </div>
    ) : (
      <ul class="item-list">
        {invitations.map((inv) => (
          <li class="card">
            <div class="item-head">
              <h3>招待リンク</h3>
              {statusTag(inv)}
            </div>
            {inv.status === "pending" && !invitationExpired(inv) && (
              <>
                <label class="form-hint" for={`invite-url-${inv.id}`}>
                  このリンクをコピーして送ってください
                </label>
                <input
                  type="text"
                  id={`invite-url-${inv.id}`}
                  class="invite-url"
                  value={`${origin}/invite/${inv.token}`}
                  readonly
                  onfocus="this.select()"
                />
                <p class="item-meta">有効期限: {formatDate(inv.expires_at)}まで</p>
                <div class="card-actions">
                  <form
                    action={`/invitations/${inv.id}/expire`}
                    method="post"
                    data-confirm="この招待リンクを無効化します。よろしいですか？"
                  >
                    <button type="submit" class="btn btn-danger">
                      無効化する
                    </button>
                  </form>
                </div>
              </>
            )}
            {inv.status === "accepted" && (
              <p class="item-meta">{formatDate(inv.updated_at)}に受諾されました</p>
            )}
          </li>
        ))}
      </ul>
    )}

    <details class="guide">
      <summary>招待のしかた</summary>
      <ol>
        <li>「招待リンクを作る」ボタンを押します</li>
        <li>表示されたリンクをコピーして、LINEやメールで送ります</li>
        <li>
          おじいちゃん・おばあちゃんがリンクを開いて登録すると、
          {child.name}さんの写真とほしいものが見られるようになります
        </li>
      </ol>
    </details>
  </>
);

// 公開ページ: 招待の受諾 + 祖父母アカウント登録（Rails: invitations#accept/#register）
export const InviteAcceptPage: FC<{
  token: string;
  childName: string;
  parentName: string;
  errors: string[];
  values: { name: string; email: string };
}> = ({ token, childName, parentName, errors, values }) => (
  <>
    <h1>🎁 {childName}さんのページへの招待</h1>
    <p class="page-lead">
      {parentName}さんから、{childName}さんの写真やほしいものリストを見られる
      ご招待が届いています。下のフォームで登録すると、すぐに見られるようになります。
    </p>
    <div class="card form-card">
      <h3>おじいちゃん・おばあちゃんの登録</h3>
      <FormErrors errors={errors} />
      <form action={`/invite/${token}/register`} method="post">
        <div class="form-group">
          <label for="name">お名前</label>
          <input type="text" id="name" name="name" value={values.name} required maxlength={50} />
        </div>
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" name="email" value={values.email} required />
        </div>
        <div class="form-group">
          <label for="password">パスワード（新しく決めてください）</label>
          <input type="password" id="password" name="password" required minlength={6} />
          <p class="form-hint">6文字以上。次回からのログインに使います</p>
        </div>
        <div class="form-group">
          <label for="password_confirmation">パスワード（確認のためもう一度）</label>
          <input
            type="password"
            id="password_confirmation"
            name="password_confirmation"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          登録して{childName}さんのページを見る
        </button>
      </form>
    </div>
    <details class="guide">
      <summary>登録すると何ができますか？</summary>
      <ul>
        <li>{childName}さんの写真をいつでも見られます</li>
        <li>{childName}さんのほしいものリストを見て、プレゼント選びに使えます</li>
        <li>プレゼントを買ったことを、親御さんにお知らせできます</li>
      </ul>
    </details>
  </>
);
