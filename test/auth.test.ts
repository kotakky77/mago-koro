import { describe, expect, it } from "vitest";
import {
  hashPassword,
  normalizeEmail,
  sha256Hex,
  validEmailFormat,
  validateNewUser,
  verifyPassword,
} from "../src/lib/auth";

describe("パスワードハッシュ (PBKDF2)", () => {
  it("正しいパスワードで検証が通る", async () => {
    const digest = await hashPassword("password", 1000);
    expect(await verifyPassword("password", digest)).toBe(true);
  });

  it("間違ったパスワードは拒否される", async () => {
    const digest = await hashPassword("password", 1000);
    expect(await verifyPassword("passw0rd", digest)).toBe(false);
  });

  it("壊れたダイジェストは拒否される", async () => {
    expect(await verifyPassword("password", "invalid")).toBe(false);
    expect(await verifyPassword("password", "pbkdf2-sha256$abc$x$y")).toBe(false);
  });
});

describe("sha256Hex（リセット/招待トークンのダイジェスト）", () => {
  it("同じ入力から同じhexを返す", async () => {
    expect(await sha256Hex("token")).toBe(await sha256Hex("token"));
    expect(await sha256Hex("token")).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("token")).not.toBe(await sha256Hex("token2"));
  });
});

describe("メールアドレス", () => {
  it("正規化: trim + 小文字化", () => {
    expect(normalizeEmail("  Parent@Example.COM ")).toBe("parent@example.com");
  });

  it("形式チェック（Railsの正規表現と同等）", () => {
    expect(validEmailFormat("parent@example.com")).toBe(true);
    expect(validEmailFormat("a+b-c.d@sub.example.jp")).toBe(true);
    expect(validEmailFormat("not-an-email")).toBe(false);
    expect(validEmailFormat("a@b")).toBe(false);
  });
});

describe("validateNewUser（Rails の User バリデーション相当）", () => {
  const valid = {
    name: "テスト太郎",
    email: "parent@example.com",
    password: "password",
    passwordConfirmation: "password",
  };

  it("正しい入力ならエラーなし", () => {
    expect(validateNewUser(valid)).toEqual([]);
  });

  it("名前なし・51文字以上を拒否", () => {
    expect(validateNewUser({ ...valid, name: " " })).toHaveLength(1);
    expect(validateNewUser({ ...valid, name: "あ".repeat(51) })).toHaveLength(1);
  });

  it("6文字未満のパスワードを拒否", () => {
    expect(
      validateNewUser({ ...valid, password: "12345", passwordConfirmation: "12345" }),
    ).toHaveLength(1);
  });

  it("パスワード確認の不一致を拒否", () => {
    expect(validateNewUser({ ...valid, passwordConfirmation: "different" })).toHaveLength(1);
  });

  it("不正なメール形式を拒否", () => {
    expect(validateNewUser({ ...valid, email: "bad" })).toHaveLength(1);
  });
});
