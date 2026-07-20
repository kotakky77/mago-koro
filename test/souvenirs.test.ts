// フェーズ2（記念品注文・管理者画面）の純粋ロジック:
// 注文フォーム・記念品フォームのバリデーションと注文ステータス遷移。
import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus, nextOrderStatuses, ORDER_STATUSES } from "../src/lib/db";
import { parseOrderForm } from "../src/routes/souvenirs";
import { parseSouvenirForm } from "../src/routes/admin";

describe("parseOrderForm", () => {
  const valid = {
    child_id: "3",
    recipient_name: "山田 花子",
    shipping_address: "東京都千代田区千代田1-1",
    contact_phone: "03-1234-5678",
  };

  it("正常な入力を受け付ける", () => {
    const { input, errors } = parseOrderForm(valid);
    expect(errors).toEqual([]);
    expect(input).toEqual({
      child_id: 3,
      recipient_name: "山田 花子",
      shipping_address: "東京都千代田区千代田1-1",
      contact_phone: "03-1234-5678",
    });
  });

  it("電話番号は任意（空なら null）", () => {
    const { input, errors } = parseOrderForm({ ...valid, contact_phone: "  " });
    expect(errors).toEqual([]);
    expect(input.contact_phone).toBeNull();
  });

  it("宛名・住所は必須", () => {
    const { errors } = parseOrderForm({ ...valid, recipient_name: "", shipping_address: " " });
    expect(errors).toContain("お届け先のお名前を入力してください");
    expect(errors).toContain("お届け先の住所を入力してください");
  });

  it("child_id が欠落・非数値なら拒否する", () => {
    for (const child_id of ["", "abc", "1.5", "-1", "0"]) {
      const { errors } = parseOrderForm({ ...valid, child_id });
      expect(errors, `child_id=${child_id}`).toContain("お孫さんを選択してください");
    }
  });

  it("フィールド欠落（undefined）でも落ちない", () => {
    const { errors } = parseOrderForm({});
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("parseSouvenirForm", () => {
  it("正常な入力を受け付ける（説明の空は null）", () => {
    const { input, errors } = parseSouvenirForm({
      name: "オリジナルマグカップ",
      price: "2800",
      description: "",
    });
    expect(errors).toEqual([]);
    expect(input).toEqual({ name: "オリジナルマグカップ", price: 2800, description: null });
  });

  it("商品名は必須", () => {
    const { errors } = parseSouvenirForm({ name: " ", price: "1000", description: "" });
    expect(errors).toContain("商品名を入力してください");
  });

  it("価格は1円以上の整数のみ", () => {
    for (const price of ["", "0", "-100", "12.5", "abc"]) {
      const { errors } = parseSouvenirForm({ name: "A", price, description: "" });
      expect(errors, `price=${price}`).toContain("価格は1円以上の整数で入力してください");
    }
  });
});

describe("注文ステータス遷移", () => {
  it("正常な遷移を許可する", () => {
    expect(canTransitionOrderStatus("pending", "processing")).toBe(true);
    expect(canTransitionOrderStatus("pending", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("processing", "shipped")).toBe(true);
    expect(canTransitionOrderStatus("processing", "cancelled")).toBe(true);
    expect(canTransitionOrderStatus("shipped", "delivered")).toBe(true);
  });

  it("逆行・スキップ・完了後の変更を拒否する", () => {
    expect(canTransitionOrderStatus("pending", "shipped")).toBe(false); // スキップ
    expect(canTransitionOrderStatus("pending", "delivered")).toBe(false);
    expect(canTransitionOrderStatus("processing", "pending")).toBe(false); // 逆行
    expect(canTransitionOrderStatus("delivered", "shipped")).toBe(false);
    expect(canTransitionOrderStatus("shipped", "cancelled")).toBe(false); // 発送後キャンセル不可
    expect(canTransitionOrderStatus("cancelled", "pending")).toBe(false);
    expect(canTransitionOrderStatus("delivered", "delivered")).toBe(false); // 同一への遷移も不可
  });

  it("未知のステータスは常に拒否する", () => {
    expect(canTransitionOrderStatus("bogus", "processing")).toBe(false);
    expect(canTransitionOrderStatus("pending", "bogus")).toBe(false);
    expect(nextOrderStatuses("bogus")).toEqual([]);
  });

  it("終端ステータスからは遷移先が無い", () => {
    expect(nextOrderStatuses("delivered")).toEqual([]);
    expect(nextOrderStatuses("cancelled")).toEqual([]);
  });

  it("全ステータスが遷移表に定義されている", () => {
    for (const status of ORDER_STATUSES) {
      expect(Array.isArray(nextOrderStatuses(status))).toBe(true);
    }
  });
});
