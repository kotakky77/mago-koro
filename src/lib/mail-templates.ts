// メール文面。Rails の app/views/user_mailer/password_reset の代替。

export function passwordResetMail(input: {
  userName: string;
  resetUrl: string;
}): { subject: string; body: string } {
  return {
    subject: "まごころおくりもの - パスワード再設定",
    body: [
      `${input.userName} 様`,
      ``,
      `「まごころおくりもの」のパスワード再設定のご案内です。`,
      `以下のリンクを開いて、新しいパスワードを設定してください。`,
      ``,
      input.resetUrl,
      ``,
      `このリンクの有効期限は2時間です。`,
      `心当たりがない場合は、このメールは破棄してください。`,
    ].join("\n"),
  };
}

/**
 * 誕生日お知らせメール（祖父母向け）。フェーズ3。
 *
 * 1通1用件。「もうすぐ誕生日」と「ほしいものリストへのリンク」だけを伝える。
 * 読む相手が高齢なので、1行を短く、専門用語を使わず、リンクは1つだけにする。
 */
export function birthdayNoticeMail(input: {
  grandparentName: string;
  childName: string;
  age: number;
  birthdayText: string; // 例: 「10月9日」
  daysBefore: number;
  wishlistUrl: string;
}): { subject: string; body: string } {
  return {
    subject: `まもなく${input.childName}さんのお誕生日です（${input.birthdayText}・${input.age}歳）`,
    body: [
      `${input.grandparentName} 様`,
      ``,
      `まもなく ${input.childName}さんのお誕生日です。`,
      ``,
      `　${input.birthdayText}に ${input.age}歳になります。（あと${input.daysBefore}日）`,
      ``,
      `${input.childName}さんの「ほしいもの」を、下のページにまとめてあります。`,
      `おくりものを選ぶときに、ご覧ください。`,
      ``,
      input.wishlistUrl,
      ``,
      `※ページを見るには、ログインが必要です。`,
      `　パスワードが分からないときは、ログイン画面の`,
      `　「パスワードをお忘れの方」から再設定できます。`,
      ``,
      `まごころおくりもの`,
    ].join("\n"),
  };
}
