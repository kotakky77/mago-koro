// Gmail API での送信。Rails版の ActionMailer + Gmail SMTP の代替。
// Workers からは SMTP が使えないため、HTTP の Gmail API を使う。
//
// 認証は OAuth の refresh_token 方式:
//   refresh_token（無期限・secretsに保存）→ access_token（1時間）→ messages/send
// refresh_token の取得は scripts/get-refresh-token.mjs を1回実行する。

const encoder = new TextEncoder();

export type GmailCredentials = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export async function getGmailAccessToken(creds: GmailCredentials): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // OAuth同意画面が「テスト」のままだと refresh_token が7日で失効し、ここで
    // invalid_grant になる。エラー本文を必ずメッセージに含めて気づけるようにする。
    throw new Error(`Gmailアクセストークン取得に失敗 (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type MimeInput = { from: string; to: string; subject: string; body: string };

// 日本語件名の RFC 2047 エンコード（=?UTF-8?B?...?=）。
// エンコード後の1ワードが75文字を超えないよう、UTF-8の文字境界で分割して
// 折り返す（分割ワードは CRLF + スペースで継続）。
export function encodeSubject(subject: string): string {
  if (/^[\x20-\x7e]*$/.test(subject)) return subject;

  // "=?UTF-8?B?" (10) + "?=" (2) = 12文字。75 - 12 = 63 → base64は4の倍数なので60文字 = 45バイト
  const MAX_BYTES_PER_WORD = 45;
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of subject) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > MAX_BYTES_PER_WORD && current !== "") {
      chunks.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += chBytes;
  }
  if (current !== "") chunks.push(current);

  return chunks.map((chunk) => `=?UTF-8?B?${base64(encoder.encode(chunk))}?=`).join("\r\n ");
}

function base64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64url(bytes: Uint8Array): string {
  return base64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

// RFC 2045: base64本文は76文字ごとに折り返す
function wrapBase64(s: string): string {
  return s.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export function buildMimeMessage(input: MimeInput): string {
  return [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodeSubject(input.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    wrapBase64(base64(encoder.encode(input.body))),
  ].join("\r\n");
}

export async function sendGmail(accessToken: string, mime: string): Promise<void> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64url(encoder.encode(mime)) }),
  });
  if (!res.ok) {
    throw new Error(`Gmail送信に失敗 (${res.status}): ${await res.text()}`);
  }
}
