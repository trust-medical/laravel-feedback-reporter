# Laravel Headless Feedback Reporter 汎用導入依頼プロンプト

このマークダウンファイルは、既存のLaravelアプリケーションに **`trust-medical/laravel-feedback-reporter`** を導入するための **AIコーディングアシスタント（Cursor, Antigravity, Claude Code, GitHub Copilot等）または開発者向けの導入依頼プロンプト** です。

以下のプロンプトブロックをコピーして、対象のLaravelプロジェクトのAIエージェントに入力してください。

---

```markdown
# 指示: Laravel Headless Feedback Reporter の導入

## 目的
本Laravelプロジェクトに、プロダクションレディな不具合報告・技術診断収集パッケージ **`trust-medical/laravel-feedback-reporter`** を導入してください。
作業を開始する前に、**まず一番最初に本プロジェクトがパッケージの動作要件を満たしているかを検証** し、要件を満たしていることを確認した上で、通常Webサイトおよび管理画面（Filamentまたは独自管理画面）への導入を完了させてください。

---

## ステップ 0: 【最優先】既存環境の導入要件チェック（Prerequisite Verification）

**作業を開始する前に、まず以下の要件を必ず最初に検証してください。**
要件を満たしていない項目が1つでもある場合は、ソースコードの変更やインストール作業を行わず、不足要件と必要なアップグレード手順をユーザーに報告して指示を仰いでください。

### 1. PHP バージョンおよび拡張機能の確認
- **判定方法**: `php -v` および `php -m` を確認
- **要件**:
  - **PHP 8.3 以上**
  - 必須PHP拡張: `fileinfo` (添付画像のMIMEタイプ実バイナリ検証に必須), `json`, `mbstring`, `pdo`

### 2. Laravel フレームワークのバージョン確認
- **判定方法**: `php artisan --version` または `composer.json` 内の `laravel/framework` バージョンを確認
- **要件**:
  - **Laravel 12.x または 13.x**
  - ※注意: Laravel 10.x / 11.x の場合はパッケージ要件（`^12.0 || ^13.0`）を満たさないため、Laravel自体のアップグレード計画が必要となります。

### 3. Composer バージョンの確認
- **判定方法**: `composer --version`
- **要件**: **Composer 2.x 以上**

### 4. Node.js およびフロントエンド環境の確認
- **判定方法**: `node -v`
- **要件**:
  - **Node.jsはViteやパッケージマネージャー（npm, pnpm, yarn, bun）でSDKをバンドルする場合のみ必要**（Node.js 20以上）。
  - **Node.js環境がない場合**: Vanilla JS / CDN / 標準HTMLフォームで実装するため、Node.jsがなくても導入可能（ステップ 4 で該当方式を選択）。

### 5. データベース要件の確認
- **判定方法**: `.env` の `DB_CONNECTION` および使用DBバージョンを確認
- **要件**:
  - ULID型（CHAR(26)）および JSONカラム（`metadata`）をサポートしていること（MySQL 8.0+, PostgreSQL 12+, SQLite 3.35+ 等）。

### 6. プロジェクト既存スタックの特定（後続ステップの分岐判定）
要件を満たしていることを確認したら、後続の実装方針を決定するために以下を特定してください:
- **管理画面**: `filament/filament` がインストールされているか？（→ ステップ 5 で 5-A または 5-B を選択）
- **フロントエンド環境**: Node.js/Vite等によるビルド環境（npm, pnpm, yarn, bun）があるか、それともNode.jsなし（Vanilla JS / CDN / 標準HTMLフォーム）か？
- **フロントエンドスタック**: Blade + Alpine.js / Tailwind CSS か？ それとも Inertia.js (Vue / React) か？（→ ステップ 4 の実装方式を選択）
- **認証ガード**: `web` ガード、Filament専用ガード、マルチ認証の有無。

---

## 1. パッケージ仕様と基本原則
- **パッケージ名**: `trust-medical/laravel-feedback-reporter`
- **フロントエンドSDK**: `@trustmedical/feedback-reporter` + `html-to-image`
- **設計思想**:
  - **Headless設計**: パッケージ側はUIや外部通知を内包せず、API・永続化トランザクション・整合性クリーンアップ・イベント発火に特化。
  - **プライバシー保護**: パスワード項目（`input[type=password]`）、Cookie値、Authorizationヘッダー等は自動非収集。DOMのマスキング（`data-feedback-redact`）や除外（`data-feedback-ignore`）を尊重。
  - **非公開ストレージ運用**: 添付ファイルはデフォルトで非公開ディスク（`local`等）に推測不可能なULIDパスで格納。閲覧には認可を通した安全なストリーミング処理が必要。
  - **イベント駆動**: 保存完了後に `TrustMedical\FeedbackReporter\Events\FeedbackStored` が発火。

---

## 2. 共通バックエンド設定（全プロジェクト共通）

### ステップ 1: パッケージインストールと設定
1. **Composer依存の追加**:
   - `composer require trust-medical/laravel-feedback-reporter`
   - ※ローカル/プライベートリポジトリ運用の場合は、`composer.json` の `repositories` 設定を確認・調整すること。
2. **設定ファイルとマイグレーションの公開**:
   - `php artisan vendor:publish --tag=feedback-reporter-config`
   - `php artisan vendor:publish --tag=feedback-reporter-migrations`
   - `php artisan migrate` を実行。
3. **環境変数および設定の調整 (`config/feedback-reporter.php`, `.env`)**:
   - `.env` 設定例:
     ```env
     FEEDBACK_REPORTER_ENABLED=true
     FEEDBACK_REPORTER_DISK=local
     FEEDBACK_REPORTER_ROUTE_PREFIX=feedback-reporter
     ```
   - `config/feedback-reporter.php` の `availability`（可用性制限）をプロジェクト要件に合わせて設定（認証必須の有無、許可環境など）。

### ステップ 2: 非公開添付画像のセキュア配信コントローラー作成
添付画像は非公開ディスク（`storage/app/feedback-reports/...`）に保存されるため、管理者が安全にプレビュー・ダウンロードできる認可付きストリーミングエンドポイントを用意してください。

1. **コントローラー作成** (例: `App\Http\Controllers\Admin\FeedbackAttachmentController`):
   - ルート例: `GET /admin/feedback-attachments/{attachment}/preview` (ルート名: `admin.feedback-attachments.preview`)
   - ルート例: `GET /admin/feedback-attachments/{attachment}/download` (ルート名: `admin.feedback-attachments.download`)
   - 処理要件:
     - 認証・認可チェック（管理者権限または特定Gate/Policyの確認）。
     - `TrustMedical\FeedbackReporter\Models\FeedbackAttachment` をバインド。
     - `Storage::disk($attachment->disk)->response($attachment->path)` または `download(...)` を返却。
     - 適切なMIMEタイプと `Cache-Control: private, no-cache` ヘッダーを付与。

### ステップ 3: 新着フィードバック通知リスナーの実装
フィードバック永続化時に発火する `FeedbackStored` イベントを購読し、開発チームへ通知するリスナーを作成してください。

1. **リスナー作成** (例: `App\Listeners\SendFeedbackNotification`):
   - 対象イベント: `TrustMedical\FeedbackReporter\Events\FeedbackStored`
   - `ShouldQueue` を実装して非同期実行。
   - 処理内容:
     - 報告元種別（通常サイト or 管理画面）を判定し、通知タイトルに反映。
     - 管理画面が存在する場合は、該当レポート詳細画面への直リンクを含める。
     - Slack Webhook / Discord / Teams / メール / データベース通知 などプロジェクト指定のチャンネルへ通知。

---

## 3. フロントエンド: 不具合報告UIの実装（通常サイト ＆ 管理画面内）

### ステップ 4: フロントエンド報告UIの構築
プロジェクトの環境に合わせて以下のいずれかの方式を選択して実装してください:

1. **方式A: Node.js / ビルドツール（Vite等）がある場合**:
   - `npm install @trustmedical/feedback-reporter html-to-image`（プロジェクトで利用中のパッケージマネージャーに合わせて `pnpm add`, `yarn add`, `bun add` を使用）
   - **Blade + Alpine.js**: `@trustmedical/feedback-reporter/alpine` の `createAlpineFeedbackReporter` を活用。
   - **Inertia.js (Vue / React)**: `createFeedbackReporter()` を利用したコンポーネント。
2. **方式B: Node.js環境がない場合（Vanilla JS / CDN / 標準HTMLフォーム）**:
   - **Vanilla JS / Fetch API**: 必要に応じてCDNから `html-to-image` を読み込み、ブラウザ標準の `fetch()` と `FormData` を用いて `/feedback-reporter/reports` へPOST送信。
   - **Alpine.js (CDN版)**: `<script src="//unpkg.com/alpinejs">` とCDN版 `html-to-image` を用いたモーダル構築。
   - **標準HTMLフォーム**: `<form method="POST" action="/feedback-reporter/reports" enctype="multipart/form-data">` によるBladeフォーム送信。

3. **機能要件（共通）**:
   - 可用性チェック（`reporter.isAvailable()` または `/feedback-reporter/availability` のGET確認）による表示制御。
   - 報告メッセージ入力欄（必須）。
   - ユーザースクリーンショット添付欄（任意）。
   - 送信ボタン（自動DOMキャプチャ中および送信中のローディング表示、二重送信防止）。
   - 送信成功メッセージ / エラーハンドリング。
4. **管理画面内ページも報告対象とする設定**:
   - 管理画面共通レイアウト（Bladeの管理用マスターレイアウト、またはFilamentレイアウト）にもウィジェットを配置。
   - 送信時、メタデータに画面コンテキスト（`source_type`: `admin_panel` または `web_site`、画面タイトル、ログイン中ユーザー情報等）を付加する。
5. **機密データ・個人情報のマスキングと除外**:
   - 不具合報告モーダル自体に `data-feedback-ignore` を付与し、モーダル自身がキャプチャに写り込まないようにする。
   - 画面内の個人情報・機密情報（顧客情報、決済情報等）の要素に `data-feedback-redact` を付与するルールを整備。

---

## 4. 管理画面・レポート管理機能の実装（条件分岐）

### 5-A. [Filamentを使用している場合]
プロジェクトでFilamentが使われている場合は、以下を実装してください:

1. **Filament管理画面内からの不具合報告**:
   - `PanelsRenderHook::BODY_END` または `USER_MENU_BEFORE` を利用して、管理画面レイアウトに不具合報告ウィジェットを注入。
   - 送信メタデータにFilament固有のコンテキスト（`panel_id`, `resource`, `page_class`, `record_id` 等）を自動付加。
   - フォームフィールド（`->extraInputAttributes(['data-feedback-redact' => true])`）やテーブルセル（`->extraCellAttributes(['data-feedback-redact' => true])`）によるマスキングを整備。
2. **Filament管理リソースの作成 (`FeedbackReportResource`)**:
   - `php artisan make:filament-resource FeedbackReport --view`
   - **一覧テーブル**: 報告元種別（通常サイト / Filament管理画面のバッジ表示）、受信日時、レポートID、報告者、発生ページ、添付数。
   - **詳細閲覧画面 (Infolist)**:
     - 報告内容、発生URL、発生元管理画面ページへ直接ジャンプするアクションボタン。
     - 技術診断情報（UserAgent, 解像度, 言語, タイムゾーン, メタデータJSON）。
     - 添付画像ギャラリー（ステップ 2 のセキュアURLによる画像プレビュー ＆ ダウンロード）。

---

### 5-B. [Filamentを使用していない場合（純粋なLaravel / 独自管理画面）]
プロジェクトでFilamentが使われていない場合は、プロジェクトの運用方針に合わせて以下のいずれかを選択・実装してください:

1. **選択肢 1: 独自管理画面へのリソース組み込み（管理画面がある場合）**:
   - **コントローラー作成** (例: `App\Http\Controllers\Admin\FeedbackReportController`):
     - `index`: レポート一覧（ページネーション、報告元別・日付別フィルター、検索機能）。
     - `show`: レポート詳細（報告メッセージ、診断情報、メタデータJSONの整形表示、添付画像一覧）。
   - **ビュー作成** (BladeまたはInertia):
     - 既存の管理画面レイアウト（`layouts/admin.blade.php` 等）を継承。
     - 発生URLへのリンク、ステップ 2 のエンドポイントを用いた添付画像プレビューとダウンロードリンクを配置。
   - **管理画面内からの報告ウィジェット設置**:
     - `layouts/admin.blade.php` のフッター付近にステップ 4 のウィジェットを配置し、管理者やオペレーターが管理画面内で遭遇した不具合もそのまま送信できるようにする。
2. **選択肢 2: シンプルな専用管理ダッシュボード作成（管理画面が存在しない場合）**:
   - 管理者権限（例: `can:view-reports` または `admin` ミドルウェア）で保護された専用のルート（`/admin/feedback-reports`）とシンプルなBladeテンプレートを作成。
   - Tailwind CSS またはプロジェクトのCSSを使って、1画面で一覧と詳細（モーダルまたはアコーディオン）を確認できるミニマルなビューを構築。
3. **選択肢 3: 通知・外部連携中心の運用（UIレス管理）**:
   - Web画面を新設せず、ステップ 3 の通知（Slack / Discord / メール等）に診断コンテキストと添付ファイル情報をリッチに記載して運用を完結させる。

---

## 5. 受け入れ・動作検証シナリオ
実装完了後、以下の検証を実施してください:

1. **可用性チェック**: 未認証時/認証時で `GET /feedback-reporter/availability` が設定通りのステータスを返すこと。
2. **通常ページからの送信テスト**: 一般サイトからテスト報告を送信し、DBおよびプライベートストレージに正常保存され、通知が送信されること。
3. **管理画面からの送信テスト**: 管理画面（Filamentまたは独自管理画面）内の各ページから送信し、画面コンテキストがメタデータに正しく記録されること。
4. **マスキングの確認**: `data-feedback-redact` を付与した要素がスクリーンショット上でマスキングされ、モーダル自身（`data-feedback-ignore`）が写り込んでいないこと。
5. **管理画面（または通知）での閲覧テスト**: レポート詳細画面で診断情報および非公開添付画像が正しくプレビュー・ダウンロードできること。

---

以上の要件を満たす実装計画を提示し、合意の上でステップバイステップで実装を進めてください。
```
