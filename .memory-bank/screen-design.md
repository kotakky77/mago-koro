# まごころおくりもの アプリ画面構成

本ドキュメントは、「まごころおくりもの」アプリの要件定義に基づいた画面構成を示します。ユーザー種別ごとに主要な画面とその役割を構造化しています。

## 1. 共通画面

アプリの全てのユーザーが利用する可能性のある画面です。

### ログイン画面

- メールアドレスとパスワードを入力してログインします。
- パスワードリセット機能へのリンクがあります。

### パスワードリセット画面

- 登録メールアドレスを入力し、パスワード再設定用のURLを受け取ります。
- 再設定用URLから新しいパスワードを設定します。

## 2. 孫の親向け画面

孫の親が主に利用する、孫の情報管理やほしいものリスト作成を行う画面群です。

### アカウント作成画面

- 親アカウントの新規登録を行います（メールアドレス、パスワード、氏名、孫の情報など）。

### 親ダッシュボード/マイページ

- ログイン後最初に表示される画面です。
- 登録した孫の基本情報や写真の一部が表示されます。
- 以下の主要機能へのリンクがあります:
  - 孫の情報編集
  - 写真管理（一覧・アップロード）
  - ほしいものリスト管理
  - 祖父母招待
  - 購入通知一覧

### 孫の情報編集画面

- 登録済みの孫の情報を編集します。

### 写真管理画面

- **写真一覧表示**: アップロード済みの孫の写真が一覧で表示されます。
- **写真アップロード機能**: 新しい写真をアップロードします（合計容量10MBまで）。
- **写真削除機能**: 不要な写真を削除します。

### ほしいものリスト管理画面

- **ほしいものアイテム一覧表示**: 現在リストに登録されているアイテムが一覧で表示されます（最大10個）。
- **アイテム追加ボタン**: 新しいアイテムをリストに追加するための画面へ遷移します。
- **各アイテムの編集/削除機能**: リスト上のアイテム情報を編集したり、削除したりできます。

### ほしいものアイテム追加画面

- 新しいほしいものアイテムの情報を入力・登録します（商品名、URLなど）。

### ほしいものアイテム編集画面

- 既存のほしいものアイテムの情報を編集・更新します。

### 祖父母招待画面

- 祖父母を招待するための固有の招待用URLを発行・表示します。
- 発行されたURLをコピーする機能があります。

### 購入通知一覧画面

- 祖父母がほしいものリストのアイテムを購入操作した際の通知が一覧で表示されます。

## 3. 祖父母向け画面

親からの招待を受けて登録し、孫の情報閲覧やほしいものリストからの購入を行う画面群です。

### 招待承諾・登録画面

- 親から送られた招待用URLにアクセスした際に表示されます。
- 孫の情報（親が登録したもの）を確認し、自身の情報を登録してアカウントを有効化します。

### 祖父母ダッシュボード/マイページ

- ログイン後最初に表示される画面です。
- 孫の写真の一部が表示されます。
- 以下の主要機能へのリンクがあります:
  - 孫の写真閲覧
  - ほしいものリスト閲覧
  - 記念品案内

### 孫の写真閲覧画面

- 親がアップロードした孫の写真が一覧で表示されます。

### ほしいものリスト閲覧画面

- 親が作成した孫の「ほしいもの」リストが一覧で表示されます。
- 各アイテムの詳細を確認するためのリンクがあります。

### ほしいものアイテム詳細画面

- ほしいものリストの各アイテムの詳細情報（商品名、URL、説明など）が表示されます。
- アイテムに対して「購入する」という操作を行うボタンがあります（実際の購入は外部サイトで行います）。

### 記念品案内画面

- アプリ管理者からの孫のイラスト入り記念品に関する案内やカタログ情報が表示されます。

## 4. アプリ管理者向け画面

アプリの運営・管理を行う管理者が利用する画面群です。

### 管理者ログイン画面

- 管理者アカウントでログインします。

### 管理者ダッシュボード

- ログイン後最初に表示される管理機能の起点となる画面です。
- 以下の主要機能へのリンクがあります:
  - ユーザー管理
  - 記念品カタログ管理
  - 注文管理

### ユーザー管理画面

- 登録されている親ユーザー、祖父母ユーザーの一覧を表示・管理します。
- 各ユーザーの詳細情報の確認やアカウントの削除ができます。

### 記念品カタログ管理画面

- 孫のイラスト入り記念品の種類、価格、デザイン例などのカタログ情報を追加、編集、削除します。

### 注文管理画面

- 祖父母からの記念品購入の注文情報（注文者、内容、配送先など）を一覧で表示・管理します。
- 注文詳細の確認や、制作業者への引き渡しに必要な情報のエクスポート機能などを検討します。
