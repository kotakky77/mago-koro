# まごころおくりもの Webサイト構造

## 1. 認証・登録関連

### 1.1 共通ページ
- **login.html**: 共通のログインページ
- **register.html**: 新規ユーザー登録ページ
- **password-reset.html**: パスワードリセット申請ページ
- **password-reset-confirm.html**: パスワードリセット確認ページ

### 1.2 管理者認証
- **admin-login.html**: 管理者専用ログインページ

## 2. 親（保護者）用ページ

### 2.1 ダッシュボード・基本機能
- **parent-dashboard.html**: 親向けダッシュボード（メインページ）
- **parent-child-edit.html**: 子供（孫）の情報編集ページ

### 2.2 ほしいものリスト管理
- **parent-wishlist.html**: ほしいものリスト一覧
- **parent-wishlist-add.html**: ほしいものリストに新規アイテム追加
- **parent-wishlist-edit.html**: ほしいものリストのアイテム編集

### 2.3 写真・通知管理
- **parent-photos.html**: 写真管理ページ
- **parent-purchase-notifications.html**: 購入通知ページ

### 2.4 招待機能
- **parent-invite.html**: 祖父母招待ページ

## 3. 祖父母用ページ

### 3.1 ダッシュボード・基本機能
- **grandparent-dashboard.html**: 祖父母向けダッシュボード（メインページ）
- **grandparent-invitation-accept.html**: 招待受け入れページ

### 3.2 ほしいものリスト閲覧
- **grandparent-wishlist.html**: 孫のほしいものリスト一覧
- **grandparent-wishlist-detail.html**: ほしいものリスト詳細

### 3.3 写真・記念品
- **grandparent-photos.html**: 写真閲覧ページ
- **grandparent-souvenirs.html**: 記念品（贈り物）カタログページ

## 4. 管理者用ページ

### 4.1 ダッシュボード・基本管理
- **admin-dashboard.html**: 管理者ダッシュボード（メインページ）
- **admin-users.html**: ユーザー管理ページ

### 4.2 コンテンツ・取引管理
- **admin-catalog.html**: 記念品カタログ管理ページ
- **admin-orders.html**: 注文管理ページ

## 5. 共通コンポーネント

### 5.1 スタイル・スクリプト
- **styles.css**: 全ページ共通のスタイル定義
- **scripts.js**: 全ページ共通のJavaScript機能

---

## サービスの特徴

この構造は「まごころおくりもの」というサービスの以下の特徴を反映しています：

### ユーザータイプ別の機能分離：

- 親（子供の親）向け機能
- 祖父母向け機能
- 管理者向け機能

### 主要機能の整理：

- ほしいものリスト管理（親）・閲覧（祖父母）
- 写真管理・共有
- 招待システム
- 記念品（贈り物）カタログ
- ユーザー・注文管理（管理者）