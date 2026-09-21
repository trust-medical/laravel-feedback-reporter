# Laravel Headless Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

**Laravel 12 および 13**（PHP 8.2+）向けの、プロダクションレディなヘッドレス不具合報告・技術診断コンテキスト収集Composerパッケージ。

[![Tests & Code Quality](https://github.com/TrustMedical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/TrustMedical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

---

## 1. コアコンセプトと明確な非責務

> [!IMPORTANT]
> **本パッケージはUIを提供しません（Headless設計）**
> ボタン、モーダル、フォーム、トーストなどのUIコンポーネントは一切含まれません。利用側Webアプリケーションが独自のUIを構築し、提供されるTypeScript SDKを呼び出します。
>
> **本パッケージは外部通知を直接送信しません**
> Slack、Discord、Microsoft Teams、メール、Webhook、GitHub Issues等の通知機能は含みません。不具合レポートが安全に永続化された後、Laravel標準イベント（`TrustMedical\FeedbackReporter\Events\FeedbackStored`）が発火します。利用側アプリケーションでこのイベントを購読し、キューや通知処理を自由に実装してください。
>
> **自動スクリーンショットは送信の必須条件ではありません**
> DOMスクリーンショット生成には `html-to-image` を利用しますが、DOMの複雑さやCORS制約により自動キャプチャが失敗することがあります。本パッケージはデフォルトで `captureFailure: 'continue'` となっており、自動キャプチャが失敗してもユーザー自身が添付したスクリーンショットやメッセージのみで安全に送信を完了できます。
>
> **デフォルトで厳格なプライバシー保護**
> パスワード入力フィールド（`input[type=password]`）、Cookieの値、Authorizationヘッダー、CSRFトークン、リクエスト/レスポンスBody、localStorage/sessionStorageの全量ダンプは絶対に収集しません。

---

## 2. システム要件

* **PHP**: 8.2 または 8.3+（Laravel 13 / Testbench 11環境ではPHP 8.3以上が必須）
* **Laravel**: 12.x または 13.x
* **Composer**: 2.x
* **Node.js**: 20+（フロントエンドTypeScript SDK用）

---

## 3. インストール

### 3.1 Composerパッケージの追加

```bash
composer require trust-medical/laravel-feedback-reporter
```

### 3.2 設定ファイルとマイグレーションの公開

```bash
# 設定ファイルの公開
php artisan vendor:publish --tag=feedback-reporter-config

# マイグレーションファイルの公開（任意、または直接実行可能）
php artisan vendor:publish --tag=feedback-reporter-migrations

# マイグレーションの実行
php artisan migrate
```

### 3.3 フロントエンドTypeScript SDKの追加

```bash
npm install @trustmedical/feedback-reporter html-to-image
```

---

## 4. 設定（Configuration）

設定ファイルは `config/feedback-reporter.php` に配置されます。

```php
return [
    // マスターマスタースイッチ
    'enabled' => (bool) env('FEEDBACK_REPORTER_ENABLED', false),

    // 多次元可用性制限（設定された全条件をANDロジックで評価）
    'availability' => [
        'environments' => ['local', 'staging'],
        'require_authentication' => true,
        'allowed_ips' => [], // 単一IPまたはCIDRブロック（IPv4/IPv6）
        'denied_ips' => [],  // allowed_ipsより優先して評価
        'gate' => null,      // オプションのLaravel Gateアビリティ名
        'policy' => null,    // FeedbackAvailabilityを実装したカスタムクラス
        'disabled_response' => 404, // 利用不可時に返却するHTTPステータスコード（404または403）
    ],

    // ルーティング設定（競合回避・手動登録に対応）
    'route' => [
        'register' => (bool) env('FEEDBACK_REPORTER_REGISTER_ROUTES', true),
        'prefix' => env('FEEDBACK_REPORTER_ROUTE_PREFIX', 'feedback-reporter'),
        'as' => env('FEEDBACK_REPORTER_ROUTE_AS', 'feedback-reporter.'),
        'domain' => env('FEEDBACK_REPORTER_ROUTE_DOMAIN', null),
        'middleware' => ['web'],
        'paths' => [
            'availability' => env('FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY', 'availability'),
            'store' => env('FEEDBACK_REPORTER_ROUTE_PATH_STORE', 'reports'),
        ],
    ],

    // レート制限設定
    'rate_limit' => [
        'max_attempts' => 10,
        'decay_minutes' => 1,
    ],

    // ストレージディスクと保存先パス（非公開ディスク推奨）
    'storage' => [
        'disk' => env('FEEDBACK_REPORTER_DISK', 'local'),
        'path' => 'feedback-reports',
    ],

    // 添付ファイル制限
    'attachments' => [
        'max_files' => 5,
        'max_file_size_kb' => 5120,    // 1ファイルあたり5MB
        'max_total_size_kb' => 20480,  // 1レポートあたり合計20MB
        'allowed_mimes' => [
            'image/png',
            'image/jpeg',
            'image/webp',
            // 注意: SVGはXSS防止のためデフォルトで除外されています
        ],
    ],

    // メタデータ制約
    'metadata' => [
        'max_bytes' => 262144, // 256 KB
        'max_depth' => 10,     // 最大ネスト階層（JSON bomb防御）
    ],
];
```

### 4.1 導入先アプリケーションとのルート競合対策・カスタマイズ

本パッケージはデフォルトで以下のルートを登録します:
- `GET /feedback-reporter/availability` (ルート名: `feedback-reporter.availability`)
- `POST /feedback-reporter/reports` (ルート名: `feedback-reporter.store`)

導入先アプリケーションの既存ルートや命名規則と衝突する場合、以下の方法で柔軟にカスタマイズまたは競合を回避できます。

#### A. プレフィックス・ルート名・個別パスの変更
環境変数または `config/feedback-reporter.php` から変更可能です:
```env
# URLプレフィックスを変更する場合 (例: /support/feedback)
FEEDBACK_REPORTER_ROUTE_PREFIX="support/feedback"

# ルート名プレフィックスを変更する場合 (例: support.feedback.)
FEEDBACK_REPORTER_ROUTE_AS="support.feedback."

# 個別サブパスを変更する場合 (例: /reports -> /submissions)
FEEDBACK_REPORTER_ROUTE_PATH_STORE="submissions"
FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY="status"
```

#### B. 自動ルート登録の無効化と手動登録 (ignoreRoutes)
Laravel標準（SanctumやHorizon等）と同様に、サービスプロバイダによる自動ルート登録を無効化し、ホスト側のルートファイル内で明示的に登録できます:

1. `AppServiceProvider` で自動登録を停止:
```php
use TrustMedical\FeedbackReporter\FeedbackReporter;

public function register(): void
{
    FeedbackReporter::ignoreRoutes();
}
```
*(または `.env` に `FEEDBACK_REPORTER_REGISTER_ROUTES=false` を設定)*

2. `routes/web.php` または `routes/api.php` で手動登録:
```php
use TrustMedical\FeedbackReporter\FeedbackReporter;

// デフォルト設定または任意のオプションを指定して登録
FeedbackReporter::routes(options: [
    'prefix' => 'helpdesk/feedback',
    'as' => 'helpdesk.feedback.',
    'middleware' => ['web', 'auth'],
]);
```

#### C. フロントエンドSDKへのエンドポイント連携
ルート設定を変更した場合でも、BladeテンプレートでLaravelのルートヘルパーを使用することで、フロントエンドへ正確なURLを自動的に連携できます:
```blade
<script>
    window.feedbackReporterConfig = {
        endpoint: '{{ route('feedback-reporter.store') }}',
        availabilityEndpoint: '{{ route('feedback-reporter.availability') }}',
    };
</script>
```

---

## 5. フロントエンドSDKの使い方

### 5.1 基本的な利用例 (Vanilla JS / 各種フレームワーク)

```ts
import { createFeedbackReporter } from '@trustmedical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

// ワンショット送信（可用性確認 -> 自動DOMキャプチャ -> 診断コンテキスト収集 -> 送信）
await reporter.report({
    message: 'チェックアウト画面で保存ボタンが反応しません。',
})
```

### 5.2 ユーザースクリーンショットと複数添付

```ts
// ユーザーが作成した画像（File inputやクリップボード貼り付け等から取得）を添付
const fileInput = document.querySelector<HTMLInputElement>('#file-picker')
const userFile = fileInput?.files?.[0]

await reporter.report({
    message: 'プロフィール設定画面のレイアウト崩れ。',
    attachments: [
        ...(userFile ? [{ file: userFile, source: 'user_screenshot' as const }] : []),
    ],
})
```

### 5.3 マスキング (Redaction) と キャプチャ除外 (Ignore)

`data-feedback-ignore` を付与した要素とその子孫は自動スクリーンショットから除外されます：

```html
<div data-feedback-ignore>
    <!-- このブロックと子孫要素はスクリーンショットに含まれません -->
</div>
```

`data-feedback-redact` を付与した要素のテキストや入力値は、キャプチャ中のみ一時的に `████████` に置換され、キャプチャ完了後の `finally` ブロックで確実に元のDOMへ復元されます：

```html
<p data-feedback-redact>
    会員番号: 1234-5678-9012
    <!-- キャプチャ中のみ自動で████████にマスキングされ、即時元に戻ります -->
</p>
```

> [!NOTE]
> `input[type=password]` 等のパスワード関連要素はデフォルトで自動除外されます。

### 5.4 Alpine.js 連携アダプター

```html
<div x-data="createAlpineFeedbackReporter()">
    <template x-if="available">
        <div>
            <textarea x-model="message" placeholder="問題の内容を入力してください..."></textarea>
            
            <input type="file" @change="addAttachment($event.target.files[0], 'user_screenshot')">

            <button @click="submit" :disabled="isSubmitting">
                <span x-show="!isSubmitting">報告を送信</span>
                <span x-show="isSubmitting">送信中...</span>
            </button>

            <p x-show="isSuccess" class="text-green-600">フィードバックが正常に送信されました。</p>
            <p x-show="errorMessage" x-text="errorMessage" class="text-red-600"></p>
        </div>
    </template>
</div>

<script type="module">
    import { createAlpineFeedbackReporter } from '@trustmedical/feedback-reporter/alpine'
    window.createAlpineFeedbackReporter = createAlpineFeedbackReporter
</script>
```

---

## 6. イベント購読と通知処理の実装例

フィードバックがDBおよびストレージへ正常に保存されると、`TrustMedical\FeedbackReporter\Events\FeedbackStored` イベントが発火します。

利用側アプリケーションの `EventServiceProvider` または Listener クラスでこれを購読します：

```php
namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

class NotifyDevTeam implements ShouldQueue
{
    public function handle(FeedbackStored $event): void
    {
        $report = $event->feedback;
        $attachmentCount = $report->attachments->count();

        // 例: SlackへのWebhook通知
        Http::post(config('services.slack.webhook_url'), [
            'text' => sprintf(
                "🚨 新しい不具合報告を受領しました [%s]\nURL: %s\nメッセージ: %s\n添付画像数: %d件",
                $report->id,
                $report->page_url,
                $report->message,
                $attachmentCount,
            ),
        ]);
    }
}
```

---

## 7. ストレージの整合性とAll-or-Nothing保証

1. 添付画像は設定されたプライベートディスクへ日付・ULIDパーティションで保存されます（`feedback-reports/YYYY/MM/DD/<report-id>/<attachment-id>.<ext>`）。
2. 画像全体のメモリ展開を避け、低コストに画像寸法（`width`, `height`）を取得します。
3. データベースレコードの作成はトランザクション内で実行されます。
4. DB処理や添付保存の途中で例外が発生した場合、保存済みの全ファイルをストレージから自動削除します（**Orphan Cleanup**）。
5. `FeedbackStored` イベントは、トランザクションが完全にコミットされた**後**にのみ発火します。

---

## 8. Dockerによるローカル開発

ホスト環境にPHPやNode.jsをインストールすることなく、すべてDocker上で開発・テストを実行できます：

```bash
# Docker環境のビルド
make build

# Composerおよびnpm依存関係のインストール
make install

# Pestテストの実行
make test-php

# Vitestフロントエンドテストの実行
make test-js

# 静的解析（PHPStan Level 8 + TypeScript型チェック）
make analyse

# コードスタイル検証（Laravel Pint + Biome）
make lint

# 自動フォーマット
make format

# フロントエンドSDKのビルド
make build-js
```

---

## 9. セキュリティとプライバシー保護原則

* **認証情報の非収集**: パスワード、Cookie値、Authorizationヘッダー、フォーム入力値全量は一切収集しません。
* **ストレージの隔離**: 添付ファイルは推測不可能なULIDパスでプライベートストレージに保存され、ディレクトリトラバーサルを防ぎます。
* **実MIME検証**: 拡張子やContent-Typeヘッダーを信用せず、finfoによる実バイナリ検証を実施。SVGはStored XSS防止のため拒否されます。
* **サーバー権限の優先**: クライアント送信ペイロードで `ip_address` や `user_id` を偽装しても、常にLaravelサーバー側で確定された値が優先されます。
* **URLサニタイズ**: URL内のトークンや機密パラメータ漏洩を防ぐため、クエリ文字列とハッシュはデフォルトで除外されます。
* **レート制限**: 名前付きレートリミッター `feedback-reporter`（デフォルト10回/分）による連打・DoS対策。

---

## ライセンス

本パッケージは [MIT license](LICENSE) に基づくオープンソースソフトウェアです。
