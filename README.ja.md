# Laravel Feedback Reporter

[English](README.md) | [日本語](README.ja.md)

Laravel 12・13向けのフィードバック報告パッケージです。安全なLaravel受信エンドポイント、TypeScript SDK、任意導入の隔離されたWeb Componentを組み合わせ、メッセージ、手動撮影したスクリーンショット、画像注釈、診断コンテキストを送信できます。

[![Tests & Code Quality](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml/badge.svg)](https://github.com/trust-medical/laravel-feedback-reporter/actions/workflows/tests.yml)
[![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

## 概要

Laravel Feedback Reporterは、メッセージ、利用者が用意した画像、診断コンテキストをLaravel applicationへ送信・保存します。

- 必須のフィードバックメッセージと任意のPNG・JPEG・WebP画像
- Shadow DOMで隔離された公式 `<trust-feedback-reporter>`
- 複数画像、添付削除、zoom、移動、手のひら、四角、矢印、Undo、図形削除
- page、viewport、screen、browser、performanceなどの診断コンテキスト
- 環境、認証、IP/CIDR、Gate、独自policyによる利用可否制御
- 非公開画像保存、MIME検証、rate limit、冪等性、失敗時のatomic cleanup
- applicationの通知・workflowへ接続する `FeedbackStored` event

利用者は端末で撮影または用意した画像を通常のfileとして選択し、必要に応じて注釈を加えて送信できます。

### 提供するレイヤー

| レイヤー | 提供内容 |
| --- | --- |
| Laravel package | 利用可否判定、受信route、validation、非公開保存、Model、保存完了event |
| `@trust-medical/feedback-reporter/widget` | 日本語・英語対応の公式Web Component |
| `@trust-medical/feedback-reporter` | 独自UI向けheadless TypeScript SDK |
| `@trust-medical/feedback-reporter/alpine` | Alpine.js用state adapter |

Widget entryだけがKonvaと画像編集UIを読み込みます。headless entryは送信と診断収集に必要なcodeだけを提供します。

packageは保存後のdataをapplicationへ渡し、review画面、添付画像のpreview・download、通知先、保持期間はapplicationの認可・運用要件に合わせて実装できます。

## 動作要件

- PHP 8.3以上
- Laravel 12または13
- Composer 2
- TypeScript SDKまたはWeb Componentを使う場合はNode.js 20以上

## インストール

Laravel packageをインストールします。

```bash
composer require trust-medical/laravel-feedback-reporter:^4.2
php artisan vendor:publish --tag=feedback-reporter-config
```

migrationはpackageから自動的に読み込まれます。application側でcopyを管理・確認する場合は、migrate前にpublishしてください。

```bash
php artisan vendor:publish --tag=feedback-reporter-migrations
php artisan migrate
```

publishしない場合は、そのまま `php artisan migrate` を実行します。

`.env` で報告機能を有効化します。

```dotenv
FEEDBACK_REPORTER_ENABLED=true
```

Widgetまたはheadless SDKを使う場合はfrontend packageも追加します。

```bash
npm install @trust-medical/feedback-reporter@^4.2
```

frontendからPOSTするlayoutにはLaravelのCSRF tokenを配置します。

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

## 利用可否とルート

既定設定では、`local` または `staging` 環境の認証済みユーザーだけが利用できます。設定された次の条件をすべて満たす必要があります。

- packageのmaster switch
- 現在のapplication環境
- 認証要件
- IP/CIDRのdenylist、続いてallowlist
- 任意のLaravel Gate
- 任意の `FeedbackAvailability` 実装class

local開発以外で有効化する前に、`config/feedback-reporter.php` を確認してください。利用不可時は404を返し、endpointの存在を公開しない設定が既定です。

既定のrouteは次のとおりです。

| Method | URI | Route name | 用途 |
| --- | --- | --- | --- |
| `GET` | `/feedback-reporter/availability` | `feedback-reporter.availability` | `{"available": true|false}` を返す |
| `POST` | `/feedback-reporter/reports` | `feedback-reporter.store` | reportを検証・保存する |

POST routeには利用可否middlewareと `feedback-reporter` rate limiterが適用されます。既定値は1分あたり10回で、認証済みuser IDまたはclient IPをkeyにします。

route prefix、name prefix、domain、middleware、個別pathは変更できます。application側でroute登録を管理する場合は、`FEEDBACK_REPORTER_REGISTER_ROUTES=false` を設定するか `FeedbackReporter::ignoreRoutes()` を呼び、application固有のoptionで登録します。

```php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use TrustMedical\FeedbackReporter\FeedbackReporter;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        FeedbackReporter::ignoreRoutes();
    }

    public function boot(): void
    {
        FeedbackReporter::routes(options: [
            'prefix' => 'support/feedback',
            'as' => 'support.feedback.',
            'middleware' => ['web', 'auth'],
        ]);
    }
}
```

## Web Component

Widgetは最短でreporterを導入する方法です。独立したentryから配布されるため、headless SDKだけを使うapplicationはKonvaやWidget codeを読み込みません。

frontend entryで一度登録します。

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

共通Blade layoutへ要素を配置します。

```blade
<trust-feedback-reporter
    endpoint="{{ route('feedback-reporter.store') }}"
    availability-endpoint="{{ route('feedback-reporter.availability') }}"
    source-type="web_site"
    route-name="{{ Route::currentRouteName() }}"
    lang="ja"
    color-scheme="auto"
></trust-feedback-reporter>
```

登録は明示的かつ冪等です。`registerFeedbackReporterElement('my-feedback-reporter')` で独自のelement名も登録できます。

### 属性

| 属性 | 既定値 | 内容 |
| --- | --- | --- |
| `endpoint` | `/feedback-reporter/reports` | report送信先URL |
| `availability-endpoint` | `/feedback-reporter/availability` | 利用可否確認URL |
| `source-type` | `web_site` | metadataへ保存するapplication定義の報告元 |
| `route-name` | なし | metadataへ保存する現在のroute |
| `panel-id` | なし | 任意の管理panel識別子 |
| `lang` | document言語 | `ja` で始まれば日本語、それ以外は英語 |
| `color-scheme` | `auto` | `auto`、`light`、`dark` |

`source-type` はreport metadataへ保存するapplication定義の値です。後述するattachmentの `source` とは別物です。

要素は非同期の `open()` と同期の `close()` methodを公開します。

### 画像エディター

同梱WidgetはPNG・JPEG・WebPを最大5枚、1枚5MB、合計20MBまで受け付けます。メッセージは常に必須で、画像は任意です。server側にも独立した制限があるため、設定を変更する場合はWidgetの固定制限と矛盾しない値にしてください。

画像ごとに次の操作を利用できます。

- 送信前の添付画像削除
- 四角と矢印の描画、その後の移動・resize・削除
- 手のひらtoolによるzoom画像内のscroll
- iconとlabelを併記したcontrolによるUndoと選択図形の削除
- 50〜200%を25%刻みでzoom
- 画像ごとのzoom・注釈状態を保った切り替え

editorは固定されたmodal内に留まり、zoomしたcontentだけがviewport内でscrollします。表示zoomはCSSへ適用し、論理座標や出力解像度を下げません。Konva layerは元画像と最大zoomで有効な範囲までbacking canvasを高密度化し、拡大時のぼやけを抑えます。未編集画像はそのまま、編集済み画像は注釈を合成して送信します。送信成功後は完了を通知してdialogを閉じます。Widgetから送る画像sourceは `attachment` です。

### 隔離とライフサイクル

Widgetのmarkupと同梱CSSはopen Shadow DOM内に配置されます。Tailwindや導入先styleを必要とせず、DOM探索とevent処理はShadow Rootまたはdialog内に限定されます。要素を切断すると、診断subscription、Konva Stage、Object URLを破棄します。

Shadow DOMは意図しないCSS・selector競合を防ぎます。同一ページですでに実行されている悪意あるscriptに対するsecurity boundaryではありません。

### Programmatic設定

header、callback、metadata、URL filter、opt-in診断が必要な場合は、要素を接続する前に `config` を設定します。

```ts
import {
    FeedbackReporterElement,
    registerFeedbackReporterElement,
} from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()

const widget = document.createElement(
    'trust-feedback-reporter',
) as FeedbackReporterElement

widget.config = {
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
    sourceType: 'admin_panel',
    routeName: 'orders.show',
    panelId: 'admin',
    reporter: {
        diagnostics: {
            errors: true,
            performance: true,
        },
        metadata: {
            application: 'back-office',
        },
    },
}

document.body.append(widget)
```

## Headless TypeScript SDK

Widgetを読み込まず独自UIを構築する場合はheadless entryを使います。利用者が選択した画像を `attachments` へ渡します。

```ts
import { createFeedbackReporter } from '@trust-medical/feedback-reporter'

const reporter = createFeedbackReporter({
    endpoint: '/feedback-reporter/reports',
    availabilityEndpoint: '/feedback-reporter/availability',
})

const input = document.querySelector<HTMLInputElement>('#feedback-images')
const files = Array.from(input?.files ?? [])

const response = await reporter.report({
    message: '保存ボタンを押しても処理が完了しません。',
    attachments: files.map((file) => ({
        file,
        source: 'attachment',
    })),
})

console.log(response.id)
```

`report()` は利用可否を確認してからcontext収集・送信を行います。`submit()` は利用可否requestを省略してcontext収集・送信を行います。`isAvailable()`、`collectContext()`、`initDiagnostics()`、`destroyDiagnostics()` も公開されています。

SDKはserver responseを `AvailabilityError`、`AttachmentValidationError`、`ValidationError`、`RateLimitError`、`ServerError`、`TransportError` として扱います。

設定では、独自CSRF解決、同期・非同期header、URL sanitization、storage key allowlist、同期・非同期metadata、診断、lifecycle callbackを指定できます。既定ではLaravelの `meta[name="csrf-token"]` を読み取ります。`FormData` の `Content-Type` はbrowserがboundaryとともに設定するため、独自headerへ追加しないでください。

### Alpine adapter

```ts
import { createAlpineFeedbackReporter } from '@trust-medical/feedback-reporter/alpine'

Alpine.data('feedbackReporter', () =>
    createAlpineFeedbackReporter({
        endpoint: '/feedback-reporter/reports',
        availabilityEndpoint: '/feedback-reporter/availability',
    }),
)
```

adapterはmessage、attachments、availability、送信状態、直近response、添付helper、`submit()` を公開します。`addAttachment()` のsource既定値は `attachment` です。

## 診断コンテキストとプライバシー

SDKは送信時に、次の制限されたsnapshotを収集します。

- sanitize済みpage URL、origin、pathname、title、referrer
- viewport、scroll位置、screen、locale、timezone、browser capability
- network状態と正規化されたperformance情報
- active elementのtag、ID、class名
- application metadataと、明示的にallowlist指定したstorage値

query値とURL hashは既定で除外します。query値はallowlistで指定したkeyだけ、hashは明示的に有効化した場合だけ含めます。browser storageは正確なkeyを設定しない限り読み取りません。

継続的なcollectorは既定で無効です。

| Option | 有効化した場合の動作 |
| --- | --- |
| `errors` | `window.onerror` を置換せず、errorと未処理rejectionを監視 |
| `console` | `console.error` と `console.warn` をwrap |
| `network` | `fetch` とXMLHttpRequestをwrapし、失敗を記録 |
| `breadcrumbs` | 制限されたclick・submit・navigation metadataを記録 |
| `performance` | 送信時のperformance snapshotを含める。明示的に `false` としない限り有効 |

global wrapperは参照カウントされ、自身が現在もactiveなwrapperである場合だけ復元されます。継続collectorを有効化したheadless reporterを破棄する際は `destroyDiagnostics()` を呼んでください。

SDKはpassword値、Cookie、Authorization header、CSRF token値、request・response body、無制限のstorageを意図的に収集しません。serverは独立して、認証user ID、client IP、User-Agent、受信日時、route、host、設定されたruntime versionを記録します。本番導入前にcustom metadataと明示的に有効化する診断情報へ個人情報・要配慮情報が含まれないか確認してください。

## 保存とapplication連携

reportとattachmentはULIDを主keyに使います。画像は次のpathへ保存されます。

```text
{storage.path}/{YYYY}/{MM}/{DD}/{report ULID}/{attachment ULID}.{extension}
```

既定diskは `local` です。画像は非公開のまま保持し、preview・downloadはGateまたはpolicyで保護したapplication routeから提供してください。SVGは既定で許可されません。serverは画像内容、1枚のsize、枚数、合計size、metadata byte数、metadata階層の深さを検証します。

database書き込みはtransaction内で行われ、失敗時には書き込み済みfileを削除してorphanを残しません。uniqueな `client_report_id` により、同じclient識別子の重複保存を防ぎます。

reportと添付の保存後、packageは `FeedbackStored` を発行します。

```php
use TrustMedical\FeedbackReporter\Events\FeedbackStored;

final class QueueFeedbackNotification
{
    public function handle(FeedbackStored $event): void
    {
        SendFeedbackNotification::dispatch($event->feedback->getKey());
    }
}
```

`FeedbackReport` と、並び順が適用された `attachments` relationを使い、application固有の確認画面を構築できます。時間のかかる通知や外部連携は送信request内で実行せずqueueへ渡してください。

## 設定リファレンス

publishされる `config/feedback-reporter.php` は次のgroupで構成されます。

- `enabled`: master switch
- `availability`: 環境、認証、IP規則、Gate、policy、拒否status
- `route`: 登録、prefix、name prefix、domain、middleware、path
- `rate_limit`: 最大試行回数と減衰時間
- `storage`: 非公開diskとbase path
- `attachments`: 枚数、1枚のsize、合計size、許可MIME
- `metadata`: 最大encode byte数と階層の深さ
- `server_context`: environment、Laravel version、PHP versionの収集switch

環境変数は設定file内で読み取ります。Laravelの設定cacheが機能するよう、application codeからは `config()` を使ってください。

## 開発とセキュリティ

```bash
vendor/bin/pest
vendor/bin/phpstan analyse
vendor/bin/pint
npm run lint
npm run typecheck
npm test
npm run build
```

DockerとWorkbenchの手順は [CONTRIBUTING.md](CONTRIBUTING.md)、変更履歴は [CHANGELOG.md](CHANGELOG.md)、脆弱性の報告方法は [SECURITY.md](SECURITY.md) を参照してください。
