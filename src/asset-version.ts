// CSS/JS の URL に付けるバージョン（中身のハッシュ）。
// /app.css は1時間キャッシュするので、デプロイ直後に「新しいHTML + 古いCSS」で
// 崩れて見えないよう、中身が変わったら URL も変わるようにする。
import appCss from "./app.css";
import appJs from "./client.js";

/** 軽量な文字列ハッシュ（FNV-1a 32bit）。改ざん検知ではなくキャッシュ破棄用 */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const CSS_VERSION = shortHash(appCss);
export const JS_VERSION = shortHash(appJs);
