// クライアントJS（フレームワーク不使用）。
// 1) data-confirm: 重要操作の確認ダイアログ
// 2) 写真モーダル: 拡大表示・前後ナビ・キーボード操作（Escape / ← →）
// 3) 写真アップロード前のブラウザ内縮小（長辺2000px・JPEG85%）
//    → R2 無料枠10GBの節約とアップロード時間の短縮

"use strict";

// ---- 確認ダイアログ ----
document.addEventListener("submit", function (e) {
  var form = e.target;
  var message = form.getAttribute("data-confirm");
  if (message && !window.confirm(message)) {
    e.preventDefault();
  }
});

// ---- 写真モーダル ----
(function () {
  var modal = document.getElementById("photo-modal");
  if (!modal) return;
  var img = modal.querySelector("img");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".photo-view-btn"));
  var current = -1;
  var lastFocused = null;

  function show(index) {
    if (index < 0 || index >= buttons.length) return;
    current = index;
    var btn = buttons[index];
    img.src = btn.getAttribute("data-full");
    img.alt = btn.getAttribute("data-alt") || "写真";
    modal.classList.add("open");
    modal.querySelector(".modal-close").focus();
  }

  function close() {
    modal.classList.remove("open");
    img.src = "";
    if (lastFocused) lastFocused.focus();
  }

  buttons.forEach(function (btn, i) {
    btn.addEventListener("click", function () {
      lastFocused = btn;
      show(i);
    });
  });

  modal.querySelector(".modal-close").addEventListener("click", close);
  modal.querySelector(".modal-nav.prev").addEventListener("click", function () {
    show((current - 1 + buttons.length) % buttons.length);
  });
  modal.querySelector(".modal-nav.next").addEventListener("click", function () {
    show((current + 1) % buttons.length);
  });
  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", function (e) {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show((current - 1 + buttons.length) % buttons.length);
    if (e.key === "ArrowRight") show((current + 1) % buttons.length);
  });
})();

// ---- アップロード前の縮小 ----
(function () {
  var form = document.querySelector("form[data-photo-upload]");
  if (!form) return;
  var input = form.querySelector('input[type="file"]');
  var submitBtn = form.querySelector('button[type="submit"]');
  var MAX_EDGE = 2000;
  var QUALITY = 0.85;
  var SKIP_UNDER_BYTES = 500 * 1024; // 500KB以下はそのまま送る

  function resizeFile(file) {
    // JPEG/PNG以外・小さいファイルは触らない（サーバー側で検証される）
    if (file.size <= SKIP_UNDER_BYTES || !/^image\/(jpeg|png)$/.test(file.type)) {
      return Promise.resolve(file);
    }
    return createImageBitmap(file)
      .then(function (bitmap) {
        var scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        if (scale === 1) return file;
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        return new Promise(function (resolve) {
          canvas.toBlob(
            function (blob) {
              if (!blob || blob.size >= file.size) return resolve(file);
              var name = file.name.replace(/\.(png|jpg|jpeg)$/i, "") + ".jpg";
              resolve(new File([blob], name, { type: "image/jpeg" }));
            },
            "image/jpeg",
            QUALITY,
          );
        });
      })
      .catch(function () {
        return file; // デコードできない形式は原本のまま（サーバーで弾く）
      });
  }

  var processed = false;
  form.addEventListener("submit", function (e) {
    if (processed || !input.files || input.files.length === 0) return;
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "写真を準備しています…";
    Promise.all(Array.prototype.map.call(input.files, resizeFile)).then(function (files) {
      var dt = new DataTransfer();
      files.forEach(function (f) {
        dt.items.add(f);
      });
      input.files = dt.files;
      processed = true;
      form.submit();
    });
  });
})();
