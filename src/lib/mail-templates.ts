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
