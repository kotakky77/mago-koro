import { describe, expect, it } from "vitest";
import { invitationExpired } from "../src/lib/db";

const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

describe("invitationExpired（Rails の Invitation#expired? 相当）", () => {
  it("pending かつ期限内なら有効", () => {
    expect(invitationExpired({ status: "pending", expires_at: future })).toBe(false);
  });

  it("期限切れは無効", () => {
    expect(invitationExpired({ status: "pending", expires_at: past })).toBe(true);
  });

  it("accepted 済みは受諾に使えない", () => {
    expect(invitationExpired({ status: "accepted", expires_at: future })).toBe(true);
  });

  it("手動で無効化されたものは使えない", () => {
    expect(invitationExpired({ status: "expired", expires_at: future })).toBe(true);
  });
});
