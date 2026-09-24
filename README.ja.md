# Laravel Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

手動スクリーンショットのアップロード、画像注釈、診断コンテキスト、任意導入のShadow DOM Web Componentを備えたLaravel 12/13向けフィードバック報告パッケージです。

[![Tests & Code Quality](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

## v4でできること

- 必須メッセージと、任意のPNG/JPEG/WebP画像を最大5枚保存します。
- DOMを画像化せず、利用者がパソコンや携帯で撮影したスクリーンショットを受け付けます。
- ズーム、全体表示、四角、矢印、Undo、削除、複数画像切り替えを備えた `<trust-feedback-reporter>` を任意で利用できます。
- WidgetのDOMとCSSをopen Shadow DOM内へ隔離します。
- パスワード、Cookie、Authorizationヘッダー、CSRFトークン、通信本文を取得せず、制限された診断情報を収集します。
- レポートと添付のコミット後に `FeedbackStored` を発行します。

Shadow DOMは意図しないCSS競合やDOMセレクターの干渉を防ぎます。同一ページ上で動く悪意あるスクリプトに対するセキュリティ境界ではありません。

## 要件とインストール

- PHP 8.3以上
- Laravel 12または13
- JavaScript SDKを利用する場合はNode.js 20以上

```bash
composer require trust-medical/laravel-feedback-reporter
php artisan vendor:publish --tag=feedback-reporter-config
php artisan vendor:publish --tag=feedback-reporter-migrations
php artisan migrate
npm install @trust-medical/feedback-reporter
```

パッケージを有効化し、利用条件を確認します。

```dotenv
FEEDBACK_REPORTER_ENABLED=true
```

既定では `local` と `staging` の認証済みユーザーだけが利用できます。`config/feedback-reporter.php` で環境、認証、IP/CIDR、Gate、独自ポリシーを設定してください。画像の保存先には非公開ディスクを推奨します。

パッケージは次のルートを登録します。

- `GET /feedback-reporter/availability`
- `POST /feedback-reporter/reports`

prefix、名前、middleware、domain、pathは変更できます。独自ルートを使う場合はboot前に `FeedbackReporter::ignoreRoutes()` を呼ぶか `FEEDBACK_REPORTER_REGISTER_ROUTES=false` とし、`FeedbackReporter::routes()` で登録してください。

## 公式Web Component

Widgetは独立エントリのため、headless利用者はKonvaやUIコードを読み込みません。

```ts
import {
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

```blade
<trust-feedback-reporter
    endpoint="{{ route('feedback-reporter.store') }}"
    availability-endpoint="{{ route('feedback-reporter.availability') }}"
    source-type="web_site"
    route-name="{{ Route::currentRouteName() }}"
    panel-id="admin"
    lang="ja"
    color-scheme="auto"
></trust-feedback-reporter>
```

登録は明示的かつ冪等です。`registerFeedbackReporterElement('my-feedback')` で別のタグ名も指定できます。表示は `light`、`dark`、`auto`、言語は要素の `lang` または文書言語から日本語・英語を選択します。

callback、header、metadata、URLフィルター、opt-in診断を渡す場合は、接続前に `config` を設定します。

```ts
import {
    FeedbackReporterElement,
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()

const widget = document.createElement('trust-feedback-reporter') as FeedbackReporterElement
widget.config = {
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
    sourceType: 'admin',
    reporter: {
        diagnostics: { errors: true, performance: true },
    },
}
document.body.append(widget)
```

切断時にはKonva Stage、Object URL、診断リスナーを破棄します。WidgetはTailwindや導入先CSSを必要としません。

## Headless SDK

```ts
import { createFeedbackReporter } from '@trust-medical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

await reporter.report({
    message: '保存操作が完了しませんでした。',
    attachments: screenshot
        ? [{ file: screenshot, source: 'user_screenshot' }]
        : [],
})
```

`report()` は利用可否確認、設定済みコンテキスト収集、送信を行います。`submit()` は利用可否確認を省略します。画像sourceは `user_screenshot` と `attachment` です。

Alpine adapterは `@trust-medical/feedback-reporter/alpine` から利用できます。

## 診断情報とプライバシー

送信時にページ、viewport、screen、browser、ネットワーク状態、active element、設定済みmetadataを収集します。継続的な監視は明示的に有効化しない限り動作しません。

```ts
const reporter = createFeedbackReporter({
    diagnostics: {
        errors: true,
        performance: true,
        console: false,
        network: false,
        breadcrumbs: false,
    },
})
```

error収集にはキャンセルしない `error` イベントリスナーを使います。console、`fetch`、XHR監視はグローバル関数をラップするためopt-inです。collectorは参照カウントされ、自身のwrapperが現在も使われている場合だけ復元するため、後から導入された処理を上書きしません。

URLのquery値とhashは既定で除外します。Storage値はkeyをallowlistに指定しない限り取得しません。本番利用前に、有効化する診断情報とmetadataに個人情報・要配慮情報が含まれないか確認してください。

## バックエンド連携

リクエスト中に通知せず、コミット後イベントを購読します。

```php
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

Event::listen(FeedbackStored::class, function (FeedbackStored $event): void {
    SendFeedbackNotification::dispatch($event->feedbackReport->getKey());
});
```

ModelはULIDを利用します。DBと添付保存はatomicで、MIME検証、metadataのサイズ・深さ制限、client report IDによる冪等性、既定10回/分のrate limitを備えます。

## v3からの移行

v4では `captureScreenshot()`、`FeedbackReporter.capture()`、`CaptureOptions`、`CaptureError`、capture設定・callback・metadata、`html-to-image`/`html2canvas-pro`依存を削除しました。capture設定を除去し、利用者が作成した画像を送信してください。

v4 migrationは既存添付のsource `automatic_capture` を不可逆に `user_screenshot` へ変更します。過去のJSON metadataは書き換えません。

## 開発

```bash
vendor/bin/pest
vendor/bin/phpstan analyse
vendor/bin/pint
npm run lint
npm run typecheck
npm test
npm run build
```

Workbenchは手動ブラウザ検証にも配布対象と同じWeb Componentを読み込みます。[CONTRIBUTING.md](CONTRIBUTING.md) と [SECURITY.md](SECURITY.md) も参照してください。
