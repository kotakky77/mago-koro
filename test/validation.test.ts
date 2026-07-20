import { describe, expect, it } from "vitest";
import { validatePhotoFile } from "../src/routes/photos";
import { parseWishlistForm } from "../src/routes/wishlist-items";

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

  it("商品名・URL必須", () => {
    expect(parseWishlistForm({ ...valid, name: "" }).errors).toHaveLength(1);
    expect(parseWishlistForm({ ...valid, url: "" }).errors).toHaveLength(1);
  });

  it("http(s)以外のURLを拒否", () => {
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
