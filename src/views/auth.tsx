import type { FC } from "hono/jsx";
import { FormErrors } from "./layout";

// トップページ（未ログイン向けの案内）
export const HomePage: FC = () => (
  <>
    <div class="hero">
      <h1>🎁 まごころおくりもの</h1>
      <p>
        お孫さんの写真やほしいものを、家族だけでやりとりできるアプリです。
        親御さんが写真とほしいものリストを登録し、おじいちゃん・おばあちゃんが
        いつでも見られます。
      </p>
      <div class="hero-actions">
        <a href="/login" class="btn btn-primary btn-lg">
          ログイン
        </a>
        <a href="/signup" class="btn btn-secondary btn-lg">
          新規登録（親御さん向け）
        </a>
      </div>
    </div>
    <div class="feature-grid">
      <div class="card">
        <div class="feature-icon">📷</div>
        <h3>写真をシェア</h3>
        <p class="card-sub">お子さんの写真をアップロードして、祖父母と共有できます</p>
      </div>
      <div class="card">
        <div class="feature-icon">🎈</div>
        <h3>ほしいものリスト</h3>
        <p class="card-sub">お子さんのほしいものを登録。祖父母がプレゼント選びに使えます</p>
      </div>
      <div class="card">
        <div class="feature-icon">💌</div>
        <h3>招待リンク</h3>
        <p class="card-sub">リンクを送るだけで、おじいちゃん・おばあちゃんを招待できます</p>
      </div>
    </div>
    <details class="guide">
      <summary>おじいちゃん・おばあちゃんの始め方</summary>
      <ol>
        <li>親御さんから届いた「招待リンク」を開きます</li>
        <li>お名前・メールアドレス・パスワードを入力して登録します</li>
        <li>登録が終わると、お孫さんの写真やほしいものが見られるようになります</li>
      </ol>
    </details>
  </>
);

export const LoginPage: FC<{ email?: string }> = ({ email }) => (
  <>
    <h1>ログイン</h1>
    <p class="page-lead">メールアドレスとパスワードを入力してください。</p>
    <div class="card form-card">
      <form action="/login" method="post">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" name="email" value={email ?? ""} required autofocus />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" name="password" required />
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          ログイン
        </button>
      </form>
      <p class="form-hint" style="margin-top:16px">
        <a href="/password_resets/new">パスワードをお忘れの方はこちら</a>
      </p>
    </div>
  </>
);

export const SignupPage: FC<{
  errors: string[];
  values: { name: string; email: string };
}> = ({ errors, values }) => (
  <>
    <h1>新規登録（親御さん向け）</h1>
    <p class="page-lead">
      お子さんの情報を管理する親御さんのアカウントを作ります。
      おじいちゃん・おばあちゃんは、親御さんからの招待リンクから登録してください。
    </p>
    <div class="card form-card">
      <FormErrors errors={errors} />
      <form action="/signup" method="post">
        <div class="form-group">
          <label for="name">お名前</label>
          <input type="text" id="name" name="name" value={values.name} required maxlength={50} />
        </div>
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" name="email" value={values.email} required />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" name="password" required minlength={6} />
          <p class="form-hint">6文字以上で入力してください</p>
        </div>
        <div class="form-group">
          <label for="password_confirmation">パスワード（確認）</label>
          <input
            type="password"
            id="password_confirmation"
            name="password_confirmation"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          登録する
        </button>
      </form>
    </div>
  </>
);

export const PasswordResetRequestPage: FC<{ error?: string }> = ({ error }) => (
  <>
    <h1>パスワードをお忘れの方</h1>
    <p class="page-lead">
      登録したメールアドレスを入力してください。パスワード再設定のリンクをお送りします。
    </p>
    <div class="card form-card">
      <FormErrors errors={error ? [error] : []} />
      <form action="/password_resets" method="post">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" name="email" required autofocus />
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          再設定メールを送る
        </button>
      </form>
    </div>
    <a href="/login" class="back-link">← ログイン画面に戻る</a>
  </>
);

export const PasswordResetEditPage: FC<{
  token: string;
  email: string;
  errors: string[];
}> = ({ token, email, errors }) => (
  <>
    <h1>新しいパスワードの設定</h1>
    <div class="card form-card">
      <FormErrors errors={errors} />
      <form action={`/password_resets/${token}?email=${encodeURIComponent(email)}`} method="post">
        <div class="form-group">
          <label for="password">新しいパスワード</label>
          <input type="password" id="password" name="password" required minlength={6} autofocus />
          <p class="form-hint">6文字以上で入力してください</p>
        </div>
        <div class="form-group">
          <label for="password_confirmation">新しいパスワード（確認）</label>
          <input
            type="password"
            id="password_confirmation"
            name="password_confirmation"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          パスワードを変更する
        </button>
      </form>
    </div>
  </>
);
