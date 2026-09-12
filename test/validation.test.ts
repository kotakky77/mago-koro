import { describe, expect, it } from "vitest";
import { validatePhotoFile } from "../src/routes/photos";
import { parseWishlistForm } from "../src/routes/wishlist-items";
import {
  birthdayNoticeTargets,
  formatMonthDay,
  jstYmd,
  upcomingAge,
} from "../src/lib/birthday";

describe("validatePhotoFile（Rails の写真バリデーション相当）", () => {
  it("10MB以下のJPEG/PNGは許可", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validatePhotoFile({ type: "image/png", size: 100 })).toBeNull();
  });

  it("GIF等の他形式は拒否", () => {
    expect(validatePhotoFile({ type: "image/gif", size: 100 })).toContain("JPEG、PNG");
    expect(validatePhotoFile({ type: "application/pdf", size: 100 })).toContain("JPEG、PNG");
  });

  it("10MB超は拒否", () => {
    expect(validatePhotoFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toContain(
      "10MB",
    );
  });
});

describe("parseWishlistForm（Rails の WishlistItem バリデーション相当）", () => {
  const valid = {
    name: "ぬいぐるみ",
    url: "https://example.com/item/1",
    price: "2980",
    description: "くまのぬいぐるみ",
    category: "おもちゃ",
    quantity: "1",
  };

  it("正しい入力ならエラーなし", () => {
    const { input, errors } = parseWishlistForm(valid);
    expect(errors).toEqual([]);
    expect(input).toEqual({
      name: "ぬいぐるみ",
      url: "https://example.com/item/1",
      price: 2980,
      description: "くまのぬいぐるみ",
      category: "おもちゃ",
      quantity: 1,
    });
  });

  it("任意項目は空なら null になる", () => {
    const { input, errors } = parseWishlistForm({ ...valid, price: "", description: "", category: "" });
    expect(errors).toEqual([]);
    expect(input.price).toBeNull();
    expect(input.description).toBeNull();
    expect(input.category).toBeNull();
  });

  it("商品名は必須", () => {
    expect(parseWishlistForm({ ...valid, name: "" }).errors).toHaveLength(1);
  });

  // URLは任意（2026-09-12）。商品が特定されていないもの（「スマホかタブレット」等）を
  // 登録できるようにするため、必須から外した
  it("URLは任意。空でもエラーにならない", () => {
    const { input, errors } = parseWishlistForm({ ...valid, url: "" });
    expect(errors).toEqual([]);
    expect(input.url).toBe("");
  });

  it("URLを入力した場合は http(s) 以外を拒否", () => {
    expect(parseWishlistForm({ ...valid, url: "javascript:alert(1)" }).errors).toHaveLength(1);
    expect(parseWishlistForm({ ...valid, url: "example.com" }).errors).toHaveLength(1);
  });

  it("数量は1以上の整数", () => {
    expect(parseWishlistForm({ ...valid, quantity: "0" }).errors).toHaveLength(1);
    expect(parseWishlistForm({ ...valid, quantity: "1.5" }).errors).toHaveLength(1);
  });

  it("価格は0以上", () => {
    expect(parseWishlistForm({ ...valid, price: "-100" }).errors).toHaveLength(1);
  });
});

describe("誕生日お知らせメールの日付計算（lib/birthday.ts）", () => {
  // JST 8:00 に発火する想定なので、UTCでは前日23:00
  const at = (iso: string) => new Date(iso);

  it("JSTの暦日に直す（UTC 23:00 は翌日扱い）", () => {
    expect(jstYmd(at("2026-09-11T23:00:00Z"))).toBe("2026-09-12");
    expect(jstYmd(at("2026-09-12T14:59:00Z"))).toBe("2026-09-12");
    expect(jstYmd(at("2026-09-12T15:00:00Z"))).toBe("2026-09-13");
  });

  it("14日後・7日後の月日を出す", () => {
    const targets = birthdayNoticeTargets(at("2026-09-11T23:00:00Z")); // JST 2026-09-12
    expect(targets.map((t) => t.kind)).toEqual(["d14", "d7"]);
    expect(targets[0]!.targetYmd).toBe("2026-09-26");
    expect(targets[1]!.targetYmd).toBe("2026-09-19");
  });

  // 楓馬くんの誕生日は10月9日。2週間前メールは9月25日に出る
  it("9/25に、10/9生まれがd14で引っかかる", () => {
    const targets = birthdayNoticeTargets(at("2026-09-24T23:00:00Z")); // JST 2026-09-25
    expect(targets[0]!.monthDays).toContain("10-09");
    expect(targets[0]!.targetYmd).toBe("2026-10-09");
  });

  it("年を跨いでも壊れない（12/30 の14日後は 1/13）", () => {
    const targets = birthdayNoticeTargets(at("2026-12-29T23:00:00Z")); // JST 2026-12-30
    expect(targets[0]!.targetYmd).toBe("2027-01-13");
    expect(targets[0]!.monthDays).toEqual(["01-13"]);
  });

  it("平年は2月29日生まれを3月1日の回で拾う", () => {
    // JST 2027-02-15 の14日後 = 2027-03-01（2027年は平年）
    const heinen = birthdayNoticeTargets(at("2027-02-14T23:00:00Z"));
    expect(heinen[0]!.monthDays).toEqual(["03-01", "02-29"]);
    // うるう年（2028）は 2/29 が実在するので救済しない
    // JST 2028-02-15 の14日後がちょうど 2028-02-29 になる
    const uruu = birthdayNoticeTargets(at("2028-02-14T23:00:00Z"));
    expect(uruu[0]!.targetYmd).toBe("2028-02-29");
    expect(uruu[0]!.monthDays).toEqual(["02-29"]);
  });

  it("その誕生日で何歳になるか", () => {
    expect(upcomingAge("2015-10-09", "2026-10-09")).toBe(11);
    expect(upcomingAge("2015-01-13", "2027-01-13")).toBe(12);
  });

  it("月日を日本語にする", () => {
    expect(formatMonthDay("10-09")).toBe("10月9日");
    expect(formatMonthDay("01-01")).toBe("1月1日");
  });
});
