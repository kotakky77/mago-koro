import { describe, expect, it } from "vitest";
import { buildMimeMessage, encodeSubject } from "../src/lib/gmail";
import { passwordResetMail } from "../src/lib/mail-templates";

describe("passwordResetMail", () => {
  it("件名・本文にリンクと有効期限の案内を含む", () => {
    const mail = passwordResetMail({
      userName: "テスト太郎",
      resetUrl: "https://mago-koro.example.workers.dev/password_resets/abc/edit?email=a%40b.com",
    });
    expect(mail.subject).toBe("まごころおくりもの - パスワード再設定");
    expect(mail.body).toContain("テスト太郎 様");
    expect(mail.body).toContain("https://mago-koro.example.workers.dev/password_resets/abc/edit");
    expect(mail.body).toContain("2時間");
  });
});

describe("MIME組み立て（gmail.ts 流用の回帰確認）", () => {
  it("日本語件名は RFC 2047 でエンコードされる", () => {
    const encoded = encodeSubject("まごころおくりもの - パスワード再設定");
    expect(encoded).toMatch(/^=\?UTF-8\?B\?/);
  });

  it("MIMEメッセージにヘッダが揃う", () => {
    const mime = buildMimeMessage({
      from: "from@example.com",
      to: "to@example.com",
      subject: "Test",
      body: "hello",
    });
    expect(mime).toContain("From: from@example.com");
    expect(mime).toContain("To: to@example.com");
    expect(mime).toContain("Subject: Test");
    expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
  });
});
