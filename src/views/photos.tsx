import type { FC } from "hono/jsx";
import type { ChildRow, PhotoRow } from "../lib/db";
import { formatDate } from "./layout";

// 写真グリッド + 拡大モーダル。親（削除ボタンあり）と祖父母（閲覧のみ)で共用。
export const PhotoGallery: FC<{ photos: PhotoRow[]; canDelete: boolean; childName: string }> = ({
  photos,
  canDelete,
  childName,
}) => (
  <>
    {photos.length === 0 ? (
      <div class="card">
        <p class="card-sub">まだ写真がありません。</p>
      </div>
    ) : (
      <div class="photo-grid">
        {photos.map((photo) => (
          <div class="photo-item">
            <button
              type="button"
              class="photo-view-btn"
              data-full={`/photos/${photo.id}/file`}
              data-alt={`${childName}さんの写真（${formatDate(photo.created_at)}）`}
              aria-label={`写真を拡大表示（${formatDate(photo.created_at)}）`}
            >
              <img
                src={`/photos/${photo.id}/file`}
                alt={`${childName}さんの写真（${formatDate(photo.created_at)}）`}
                loading="lazy"
              />
            </button>
            {canDelete && (
              <form
                action={`/photos/${photo.id}/delete`}
                method="post"
                class="photo-delete-form"
                data-confirm="この写真を削除します。よろしいですか？"
              >
                <button type="submit" class="btn btn-danger" aria-label="この写真を削除">
                  🗑
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    )}
    {/* 拡大表示モーダル（app.js が制御） */}
    <div id="photo-modal" class="modal" role="dialog" aria-modal="true" aria-label="写真の拡大表示">
      <button type="button" class="modal-close" aria-label="閉じる">
        ×
      </button>
      <button type="button" class="modal-nav prev" aria-label="前の写真">
        ‹
      </button>
      <img src="" alt="" />
      <button type="button" class="modal-nav next" aria-label="次の写真">
        ›
      </button>
    </div>
  </>
);

// 親向け: 写真管理ページ（Rails: children/photos#index）
export const ChildPhotosPage: FC<{ child: ChildRow; photos: PhotoRow[] }> = ({
  child,
  photos,
}) => (
  <>
    <a href="/parent/dashboard" class="back-link">← マイページに戻る</a>
    <h1>{child.name}さんの写真</h1>
    <p class="page-lead">アップロードした写真は、招待したおじいちゃん・おばあちゃんも見られます。</p>

    <div class="card">
      <h3>写真のアップロード</h3>
      <form
        action={`/children/${child.id}/photos`}
        method="post"
        enctype="multipart/form-data"
        data-photo-upload
      >
        <div class="form-group">
          <label for="photos">写真を選ぶ（複数選択できます）</label>
          <input
            type="file"
            id="photos"
            name="photos"
            accept="image/jpeg,image/png"
            multiple
            required
          />
          <p class="form-hint">JPEG・PNG形式、1枚10MBまで。大きい写真は自動で縮小されます。</p>
        </div>
        <button type="submit" class="btn btn-primary btn-lg">
          アップロードする
        </button>
      </form>
    </div>

    <h2>写真一覧（{photos.length}枚）</h2>
    <PhotoGallery photos={photos} canDelete={true} childName={child.name} />
  </>
);
