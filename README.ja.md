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
- 非公開画像保存、MIME・pixel数の検証、rate limit、冪等なretry、保持期間によるprune
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
- TypeScript SDKまたはWeb Componentを使う場合はNode.js 22以上

## インストール

このpackageはPackagistやnpm registryではなくGitHubから配布します。applicationの `composer.json` にrepositoryを追加します。

```json
{
    "repositories": [
        {
            "type": "vcs",
            "url": "https://github.com/trust-medical/laravel-feedback-reporter"
        }
    ]
}
```

Laravel packageをインストールします。versionはrepositoryのGit tagから解決されます。

```bash
composer require trust-medical/laravel-feedback-reporter:^4.4
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

Widgetまたはheadless SDKを使う場合は、Git tagを指定してfrontend packageも追加します。

```bash
npm install github:trust-medical/laravel-feedback-reporter#v4.4.0
```

import名は `@trust-medical/feedback-reporter` のままです。npmはsemver範囲ではなくGit tagを固定するため、更新時はtagを明示的に変更してください。

frontendからPOSTするlayoutにはLaravelのCSRF tokenを配置します。

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

PHPの `upload_max_filesize`・`post_max_size` と、nginxの `client_max_body_size` などproxy側の上限は、設定した添付の上限（既定では1 fileあたり5MB、1 requestあたり20MBとform field）以上にしてください。足りない場合、uploadはpackageに届く前に413またはvalidation errorで失敗します。

## 利用可否とルート

既定設定では、`local` または `staging` 環境の認証済みユーザーだけが利用できます。設定された次の条件をすべて満たす必要があります。

- packageのmaster switch
- 現在のapplication環境
- 認証要件
- IP/CIDRのdenylist、続いてallowlist
- 任意のLaravel Gate
- 任意の `FeedbackAvailability` 実装class。設定したclassがcontractを実装していない場合は利用不可になります

local開発以外で有効化する前に、`config/feedback-reporter.php` を確認してください。利用不可時の送信には既定でmessageなしの404を返し、endpointの存在を公開しません。`disabled_response` には403か404を指定でき、それ以外の値は404として扱います。

IP規則とIP単位のrate limitは `$request->ip()` を使います。load balancerやreverse proxyの背後では、client IPが正しく取れるようLaravelのtrusted proxyを設定し、任意の送信元のforwarded headerを信頼しないでください。記録する `host` はrequestから読み取るため、必要に応じてtrusted hostも設定してください。

既定のrouteは次のとおりです。

| Method | URI | Route name | 用途 |
| --- | --- | --- | --- |
| `GET` | `/feedback-reporter/availability` | `feedback-reporter.availability` | 利用可否と、利用可能な場合はupload上限を返す |
| `POST` | `/feedback-reporter/reports` | `feedback-reporter.store` | reportを検証・保存する |

どちらのrouteも、requestに `Accept` headerがなくても常にJSONで応答します。利用可能な場合のresponseには、frontendがupload前に適用する上限が含まれます。

```json
{
    "available": true,
    "limits": {
        "max_files": 5,
        "max_file_size_kb": 5120,
        "max_total_size_kb": 20480,
        "allowed_mimes": ["image/png", "image/jpeg", "image/webp"],
        "max_message_length": 10000,
        "max_metadata_bytes": 262144,
        "max_metadata_depth": 10
    }
}
```

利用不可の場合は `{"available": false}` です。新しいreportは `201` で `{"id": "...", "success": true}` を返します。同じ `client_report_id` でのretryは `200` で `"duplicate": true` を返します（[保存とapplication連携](#保存とapplication連携) を参照）。

POST routeには利用可否middlewareと `feedback-reporter` rate limiterが適用されます。既定値は1分あたり10回で、認証済みuser IDまたはclient IPをkeyにします。GET routeには別の `feedback-reporter-availability` rate limiter（既定値は1分あたり60回）が適用されるため、利用可否の確認で送信回数の上限を消費しません。

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

`source-type` はreport metadataへ保存するapplication定義の値です。後述するattachmentの `source` とは別物です。属性は `config` propertyより優先されます。route名がない場合など、空の `route-name`・`panel-id` 属性は未指定として扱います。

要素は非同期の `open()` と同期の `close()` methodを公開します。

### 画像エディター

Widgetは画像の枚数、1枚のsize、合計size、MIMEの上限を利用可否responseから読み取るため、確認処理と案内表示はserver設定に従います。`limits` を返さないserverの場合は既定値（PNG・JPEG・WebPを最大5枚、1枚5MB、合計20MB）を使います。メッセージは常に必須で、空白だけにはできません。画像は任意です。serverも独立して検証します。

画像ごとに次の操作を利用できます。

- 送信前の添付画像削除
- 四角と矢印の描画、その後の移動・resize・削除
- 手のひらtoolによるzoom画像内のscroll
- iconとlabelを併記したcontrolによるUndoと選択図形の削除
- 50〜200%を25%刻みでzoom
- 画像ごとのzoom・注釈状態を保った切り替え

editorは固定されたmodal内に留まり、zoomしたcontentだけがviewport内でscrollします。表示zoomはCSSへ適用し、論理座標や出力解像度を下げません。Konva layerは元画像と最大zoomで有効な範囲までbacking canvasを高密度化し、拡大時のぼやけを抑えます。未編集画像はそのまま、編集済み画像は注釈を合成して送信します。送信成功後は完了を通知してdialogを閉じます。Widgetから送る画像sourceは `attachment` です。

送信に失敗した場合、同じ下書きからのretryでは同じ `client_report_id` を使うため、serverが保存済みのrequestは重複しません。dialogを閉じるか要素を切断すると、送信中のrequestを中断します。利用不可の場合は、dialogを開いたうえでmessageを表示し、formを無効化します。session切れ（419）、requestが大きすぎる場合（413）、timeoutを含むerrorは、Widgetの言語で表示されます。

### 隔離とライフサイクル

Widgetのmarkupと同梱CSSはopen Shadow DOM内に配置されます。Tailwindや導入先styleを必要とせず、DOM探索とevent処理はShadow Rootまたはdialog内に限定されます。要素を切断すると、送信中のrequestを中断し、診断subscription、Konva Stage、Object URLを破棄します。

Widget moduleはserver-side renderingの中でもimportできます。custom element classは、browserで `registerFeedbackReporterElement()` を実行したときに定義されます。

Shadow DOMは意図しないCSS・selector競合を防ぎます。同一ページですでに実行されている悪意あるscriptに対するsecurity boundaryではありません。

### Programmatic設定

header、callback、metadata、URL filter、timeout、opt-in診断が必要な場合は `config` を設定します。できるだけ要素の接続前に設定してください。要素の定義前に設定した値はupgrade時に反映されます。接続後に設定するとWidgetを作り直し、未送信の下書きは破棄されます。

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
        timeoutMs: 60000,
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

`report()` は `getAvailability()` で利用可否を確認してからcontext収集・送信を行います。`submit()` は利用可否requestを省略してcontext収集・送信を行います。そのほかのpublic method:

- `getAvailability()` は `{ available, limits? }` を返し、`submit()` がupload前に確認するserverの上限をcacheします
- `getLimits()` はcache済みのserver上限、なければ既定値を返します
- `isAvailable()` はbooleanを返し、失敗はすべて利用不可として扱います
- `collectContext()`、`initDiagnostics()`、`destroyDiagnostics()`

SDKはupload前に添付の枚数、1枚のsize、合計size、MIMEを確認し、size・深さの上限を超えるmetadataを拒否し、`page_title` を255文字、`page_url` を2048文字に切り詰めます。同じreportをretryするときは `submit()` または `report()` に `clientReportId` を渡します。値は `^[A-Za-z0-9_-]{8,64}$` に一致する必要があり、省略すると生成されます。`timeoutMs`（既定 `60000`、`0` で無効）は利用可否確認と送信の両方に適用されます。requestは `credentials: 'same-origin'` で送信します。

| 状況 | Error |
| --- | --- |
| client側の添付確認に失敗 | `AttachmentValidationError` |
| `422`、または送信前にmetadataが上限を超えた（`statusCode` は `0`） | `ValidationError` |
| `429` | `RateLimitError` |
| 送信時の `403`・`404`、または `report()` で利用不可と判明 | `AvailabilityError` |
| `419`（sessionまたはCSRF tokenの期限切れ） | `SessionExpiredError` |
| `413`（requestが大きすぎる） | `PayloadTooLargeError` |
| `timeoutMs` を超えた | `TimeoutError` |
| `5xx` | `ServerError` |
| network失敗（`statusCode` なし）やその他のstatus | `TransportError` |

`SessionExpiredError`、`PayloadTooLargeError`、`TimeoutError` は `TransportError` を継承します。`duplicate: true` の `200` responseは成功として扱います。

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

adapterはmessage、attachments、availability、送信状態、直近response、`lastError`、field単位の `fieldErrors`、添付helper、`submit()` を公開します。`available` は `init()` が利用可否の確認を終えるまで `null` です。`submit()` は失敗を再送出せずstateへ記録し、送信に成功するまでretryでは同じ `clientReportId` を使います。利用者が下書きを変更したら `markEdited()` を呼んで前回の成功状態を消し、componentを削除するときは `destroy()` を呼んでください。`addAttachment()` のsource既定値は `attachment` です。

## 診断コンテキストとプライバシー

SDKは送信時に、次の制限されたsnapshotを収集します。

- sanitize済みpage URL、origin、pathname、title、referrer
- viewport、scroll位置、screen、locale、timezone、browser capability
- network状態と正規化されたperformance情報
- active elementのtag、ID、class名
- application metadataと、明示的にallowlist指定したstorage値

query値とURL hashは既定で除外します。query値はallowlist（`query.mode: 'allowlist'`）で指定したkeyだけを含めるか、指定したkey以外を残す（`query.mode: 'exclude'`）ことができます。hashは明示的に有効化した場合だけ含めます。browser storageは正確なkeyを設定しない限り読み取らず、値は1件あたり1KBに切り詰めます。

継続的なcollectorは既定で無効です。reportには、そのreporterまたはWidget自身が有効にしたcollectorの情報だけが含まれます。

| Option | 有効化した場合の動作 |
| --- | --- |
| `errors` | `window.onerror` を置換せず、errorと未処理rejectionを監視。script URLはsanitizeする |
| `console` | `console.error` と `console.warn` をwrap。引数は最大10個、各500文字まで保持 |
| `network` | `fetch` とXMLHttpRequestをwrapし、失敗を記録 |
| `breadcrumbs` | 制限されたclick・submit・navigation metadataを記録 |
| `performance` | 継続的なcollectorではなく、送信時に1回取得するsnapshot。明示的に `false` としない限り含める |

global wrapperは参照カウントされ、自身が現在もactiveなwrapperである場合だけ復元されます。継続collectorを有効化したheadless reporterを破棄する際は `destroyDiagnostics()` を呼んでください。

SDKはpassword値、Cookie、Authorization header、CSRF token値、request・response body、無制限のstorageを意図的に収集しません。本番導入前にcustom metadataと明示的に有効化する診断情報へ個人情報・要配慮情報が含まれないか確認してください。

serverはclientとは独立して次の情報を記録します。

- column: `user_id`、`ip_address`、`user_agent`（1024文字に切り詰め）
- `metadata.server`: `received_at`、`ip_address`、`http_method`、`host`、`server_route`（pageのrouteではなく受信routeの名前）、`authenticated_user_id`。`server_context` で有効な場合は `environment`、`laravel_version`、`php_version` も含みます。clientが送った `server` keyは上書きされます

`FeedbackReport` を配列やJSONへserializeすると、`ip_address` と `user_agent` は隠されます。

## 保存とapplication連携

reportとattachmentはULIDを主keyに使います。画像は次のpathへ保存されます。

```text
{storage.path}/{YYYY}/{MM}/{DD}/{report ULID}/{attachment ULID}.{extension}
```

既定diskは `local` で、fileはprivate visibilityで保存されます。画像は非公開のまま保持し、preview・downloadはGateまたはpolicyで保護したapplication routeから提供してください。SVGは既定で許可されません。serverは画像の実MIME、1枚のsize、枚数、合計size、pixel数（`attachments.max_pixels`）、`http`・`https` のpage URL、viewportとscreenの範囲、timezone、metadata byte数、metadata階層の深さを検証します。不正なmetadataを含め、validation errorはすべてfileを書き込む前に422を返します。

fileはdatabase transactionの前に書き込まれます。書き込みかtransactionが失敗した場合、書き込み済みのfileとreport directoryを削除します。`FeedbackStored` はtransactionのcommit後にだけ発行され（外側のtransaction内で実行した場合も同様）、この削除処理の外で発行されるため、listenerが失敗しても保存済みreportのfileは消えません。

`client_report_id` は冪等keyです。同じ送信者（同じ認証user、guestの場合は同じIP address）が同じkeyで再送すると、fileの保存やeventの再発行をせずに既存reportを `200` と `"duplicate": true` で返します。同時に重複requestが来た場合も同じです。別の送信者がすでに使ったkeyは422で拒否します。

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

### 削除と保持期間

Eloquentで `FeedbackReport` または `FeedbackAttachment` を削除すると、保存されたfileも削除されます。database cascadeやquery builderでの削除はmodel eventを通らずfileが残るため、modelから削除してください。

`retention.days` を設定すると、Laravelの `model:prune` で古いreportとfileを削除できます。値が `null` の場合は無効です。modelはpackage内にあるため、schedule時に明示的に指定します。

```php
// routes/console.php
use Illuminate\Support\Facades\Schedule;
use TrustMedical\FeedbackReporter\Models\FeedbackReport;

Schedule::command('model:prune', ['--model' => [FeedbackReport::class]])->daily();
```

## 設定リファレンス

publishされる `config/feedback-reporter.php` は次のgroupで構成されます。

- `enabled`: master switch
- `availability`: 環境、認証、IP規則、Gate、policy、拒否status
- `route`: 登録、prefix、name prefix、domain、middleware、path
- `rate_limit`: 送信と利用可否確認それぞれの最大試行回数と減衰時間
- `storage`: 非公開diskとbase path
- `attachments`: 枚数、1枚のsize、合計size、許可MIME、最大pixel数
- `metadata`: 最大encode byte数と階層の深さ
- `server_context`: environment、Laravel version、PHP versionの収集switch
- `retention`: `model:prune` で削除するまでreportを保持する日数

設定fileは次の環境変数を読み取ります。

| 環境変数 | 設定key | 既定値 |
| --- | --- | --- |
| `FEEDBACK_REPORTER_ENABLED` | `enabled` | `false` |
| `FEEDBACK_REPORTER_REGISTER_ROUTES` | `route.register` | `true` |
| `FEEDBACK_REPORTER_ROUTE_PREFIX` | `route.prefix` | `feedback-reporter` |
| `FEEDBACK_REPORTER_ROUTE_AS` | `route.as` | `feedback-reporter.` |
| `FEEDBACK_REPORTER_ROUTE_DOMAIN` | `route.domain` | `null` |
| `FEEDBACK_REPORTER_ROUTE_PATH_AVAILABILITY` | `route.paths.availability` | `availability` |
| `FEEDBACK_REPORTER_ROUTE_PATH_STORE` | `route.paths.store` | `reports` |
| `FEEDBACK_REPORTER_DISK` | `storage.disk` | `local` |

Laravelの設定cacheが機能するよう、application codeからは `config()` を使ってください。publishした設定にkeyがない場合、packageは制限の強い既定値を使います（例：`availability.environments` は `local` と `staging`）。

## 開発とセキュリティ

開発toolはDocker内で実行します。

```bash
make test       # PestとVitest
make analyse    # PHPStanとTypeScript
make lint       # Pint（--test）とBiome
make audit      # composer auditとnpm audit
make build-js   # dist/を再build
make serve      # http://localhost:8000 でWorkbenchを起動
```

DockerとWorkbenchの手順は [CONTRIBUTING.md](CONTRIBUTING.md)、変更履歴は [CHANGELOG.md](CHANGELOG.md)、脆弱性の報告方法は [SECURITY.md](SECURITY.md) を参照してください。
