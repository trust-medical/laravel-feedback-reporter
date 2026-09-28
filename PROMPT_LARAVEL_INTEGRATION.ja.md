# Laravel Feedback Reporter v4.4 導入プロンプト

以下をAIコーディングアシスタントへの依頼文、または実装チェックリストとして利用してください。

```markdown
# Laravel Feedback Reporter v4.4を導入する

このLaravelアプリケーションへ `trust-medical/laravel-feedback-reporter:^4.4` と `@trust-medical/feedback-reporter`（Git tag `v4.4.0` からinstall）を導入してください。どちらもPackagistやnpm registryではなくGitHubから配布されます。v4はmessageを必須とし、利用者がパソコンや携帯で撮影したスクリーンショットをuploadする方式です。画像は任意です。DOMの自動画像化やv3以前のcapture動作は実装しないでください。

## 最初にapplicationを確認する

編集前に次を確認してください。

- PHP 8.3以上とfileinfo、json、mbstring、PDO
- Laravel 12または13とComposer 2
- CHAR(26) ULIDとJSONを扱えるdatabase
- Widgetまたはheadless SDKをbundleする場合はNode.js 22以上
- install済みpackageのversionとapplication固有の規約

共通Blade componentとVite entryの配置、reporterを表示する一般画面・管理画面のlayout、support dataを保護するguard・role・Gate・policyを調査してください。guestからの報告を許可するか、許可するenvironment・networkも確認します。非公開storage disk、trusted proxy、queue、notification、管理画面framework、test構成も把握してください。

不足要件がある場合は、依存を追加する前に報告してください。独自UIが明示的に必要でなければ公式Widgetを優先します。Widgetと別にapplication独自の画像editorを重複実装しないでください。

## バックエンドを導入する

1. applicationの `composer.json` にGitHubのVCS repository（`"repositories": [{"type": "vcs", "url": "https://github.com/trust-medical/laravel-feedback-reporter"}]`）を追加してから、packageをinstallし、configをpublishしてmigrateします。

   ```bash
   composer require trust-medical/laravel-feedback-reporter:^4.4
   php artisan vendor:publish --tag=feedback-reporter-config
   php artisan migrate
   ```

   package migrationは自動的に読み込まれます。application側でmigrationのcopyを管理する場合だけ、migrate前に `feedback-reporter-migrations` をpublishします。
2. configと環境変数でpackageを有効化します。環境変数はconfig file以外から直接参照しません。
3. environment、authentication、IPのallowlist・denylist、custom availability policy、利用不可時response、route middleware、rate limit、validation limit、storageを確認します。添付は非公開diskへ保存します。
4. application固有のroute optionが不要ならpackageのavailability・submission routeを使います。独自routeにはavailability middleware、CSRF、認証・認可、rate limitを維持します。
5. PHPの `upload_max_filesize`・`post_max_size` と、proxy側のbody上限（nginxの `client_max_body_size` など）が、設定した添付の上限以上であることを確認します。保持期間を決め、必要なら `retention.days` を設定して、`--model` に `TrustMedical\FeedbackReporter\Models\FeedbackReport` を指定した `model:prune` をscheduleします。

組み込みの利用可否条件はANDで結合されます。「認証済みuser、または許可済みguest IP/CIDR」のようなOR条件はsubmission routeを緩めず、`TrustMedical\FeedbackReporter\Contracts\FeedbackAvailability` を実装してください。client IPやCIDRで制限する前にLaravelのtrusted proxy設定を確認し、正しく構成されていないforwarded headerを信頼しません。

利用可否は次の三層で適用します。

1. UXのためBlade componentを条件付きで描画する。
2. Widgetが開く前にavailability endpointを確認する。
3. submissionにpackageのserver-side availability middlewareを必須とする。

security boundaryは三層目です。client側の非表示はserver認可の代替になりません。

## 公式Widgetを追加する

Git tagを指定してfrontend packageをinstallします。import名は `@trust-medical/feedback-reporter` のままです。

```bash
npm install github:trust-medical/laravel-feedback-reporter#v4.4.0
```

custom elementの登録だけを行う小さなVite entryを1つ作ります。

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

登録は明示的かつ冪等です。Widgetは独立entryなので、headless利用者はKonvaやWidget codeを読み込みません。

endpoint、locale、利用可否、asset loadを揃えるため、elementを1つの再利用可能なBlade componentで包みます。

```blade
@props(['sourceType' => 'web_site', 'panelId' => null, 'routeName' => null])

@if (app(\TrustMedical\FeedbackReporter\FeedbackReporter::class)->available(request()))
    <trust-feedback-reporter
        endpoint="{{ route('feedback-reporter.store') }}"
        availability-endpoint="{{ route('feedback-reporter.availability') }}"
        source-type="{{ $sourceType }}"
        lang="{{ app()->getLocale() }}"
        color-scheme="auto"
        @if ($panelId) panel-id="{{ $panelId }}" @endif
        @if ($routeName) route-name="{{ $routeName }}" @endif
    ></trust-feedback-reporter>

    @once
        @vite('resources/js/feedback-reporter.ts')
    @endonce
@endif
```

導入先のasset stack規約に合わせ、entryは一度だけ読み込みます。一般画面では `source-type="web_site"` と現在のnamed route、管理画面では `source-type="admin_panel"`、panel identifier、現在のnamed routeを渡します。

Filamentでは `PanelsRenderHook::BODY_END` などのpanel render hookから同じBlade componentを描画します。Filament専用の別reporterを作りません。他の管理画面frameworkでも同等のlayout hookを使います。

programmaticなoptionが必要なら、elementがDOMへ接続される前に `config` propertyへ渡します。接続後に渡すとWidgetが作り直され、未送信の下書きは破棄されます。Widget用のTailwind utility、global CSS、直接のKonva依存は追加しません。WidgetはeditorとCSSをopen Shadow DOM内に同梱します。application codeから内部DOMを検索・変更しません。

Shadow DOMは意図しないstyle・selector競合を防ぎますが、同じページ上の悪意あるJavaScriptに対するsecurity boundaryではありません。Widget自身がlistener、Konva instance、Object URLを管理し、切断時に破棄します。

## 必要な場合だけheadlessを使う

独自UIが明示的に必要な場合は `createFeedbackReporter()` またはAlpine adapterを使います。messageは必須、画像は任意です。利用者が作成したPNG/JPEG/WebPをsource `user_screenshot` または `attachment` で送信します。利用可否、validation feedback、retry操作をaccessibleにします。headlessのみの統合ではWidget entryを読み込みません。

## 診断情報とprivacy

別要件がなければWidgetの既定値を使います。console、fetch、XHR、breadcrumbの継続監視は明示的な承認がない限り無効のままにします。有効化する場合はprivacyとglobal wrapperへの影響を文書化します。error監視はcancelしないevent listenerを使います。

password、Cookie、Authorization header、CSRF token、request/response body、無制限のbrowser storageを収集しません。custom metadataに個人情報を入れません。query stringやURL fragmentには機密情報が含まれ得るため、review済みの要件がなければprivacyを守る既定値を維持します。

診断contextは信頼済み入力ではなくsupport dataとして扱い、HTML出力時にescapeします。管理画面にはreviewerが必要とするfieldだけを表示し、raw arbitrary metadataを既定で公開しません。

## reviewerのアクセスを安全に実装する

管理UIはapplication側の責務です。必要なら既存frameworkと規約に沿う読み取り専用の一覧・詳細を実装します。明示的な要件がなければcreate、edit、delete actionを追加しません。削除が必要な場合は、添付fileも消えるようEloquent model経由で削除します。通常は受付日時、ULID、source、user、message、page title/URL、添付数、source・受付日のfilter、選択済み診断情報、添付galleryを含めます。eager loadingまたはaggregate countでN+1を避けます。

画像はpublic web root外へ保存します。preview/download routeをauthenticationとapplicationのGateまたはpolicyで保護し、管理resourceにも同じ認可を適用します。authenticationだけでは不十分です。認証済みでもreviewerでなければ拒否してください。

route model bindingを使い、storage objectの存在を確認し、なければ404を返します。Laravel filesystemのresponse APIでstored MIME typeと `Cache-Control: private, no-store` を付けてstreamします。public storage symlinkで添付を公開しません。

通知やworkflowが必要なら `TrustMedical\FeedbackReporter\Events\FeedbackStored` を購読します。保存済みreportは `$event->feedback` です。時間のかかる処理はqueueへ送り、永続化成功前に通知しません。

## 旧版の統合を整理する

v3以前を置き換える場合は、`html-to-image`、`html2canvas-pro`、capture API/config/callback、自動capture UI、CORS画像filter、capture retry警告、capture専用stylesheet `crossorigin` 設定、`data-feedback-ignore` / `data-feedback-redact` 規約を削除します。手動upload画像のためのCORS workaroundは追加しません。

v4 migrationは既存の `automatic_capture` sourceを `user_screenshot` へ変換します。過去のJSON metadataは履歴として維持されます。

## 統合をテストする

導入先のPest/PHPUnitとbrowser testの規約に従います。必要に応じてfactory、storage、event、notificationのfakeを使います。

Feature testには次を含めます。

- 対象となるguest、認証user、拒否user、exact IP/CIDR、無効environmentの各利用可否分岐
- UXとしてのWidget表示制御と、security boundaryとしての直接POST拒否
- messageのみ、およびmultipart画像付きの正常送信
- message必須、不正MIME、1枚/枚数/合計size、rate limit、client report IDの再送（同じ送信者には既存reportを200と `duplicate: true` で返し、別の送信者は422で拒否）
- response、DB状態、添付storage、event発行、複数file保存失敗時のcleanup
- reviewerと非reviewerによるreport resourceへのアクセス
- 認可済みpreview/download、拒否、storage object欠損
- reportと診断情報のescape

PHP Feature testで証明できない動作だけをbrowser testで確認します。Widget登録、Shadow Root描画、upload、添付削除、annotation、icon付きの移動・手のひらtool、zoom、GUIによるUndo・図形削除、画像切り替え、送信完了表示と自動close、mobileの折り返しとscroll、一般画面・管理画面の両方を対象にします。強いhost CSSと同名data属性を加え、styleが双方向に漏れないことも確認します。固定sleepではなく観測可能なUI状態を待ち、JavaScript errorがないことをassertします。

## 受け入れ確認

- 画像なしでmessageを送信でき、1枚以上の手動スクリーンショットを削除・annotation・panして送信できる。
- 利用可否とreviewer認可が合意したauth、environment、network、Gate、policyへ一致する。
- 非公開添付へ認可なしでアクセスできない。
- 指定された全layoutでWidgetが動作し、hostとWidget間でstyleが漏れない。
- mobileでcontrolが折り返され、editorをscrollできる。
- 自動captureの依存、code、文言、CORS workaroundが残っていない。
- 対象となるPHP test、static analysis、format、frontend test、typecheck、production build、Composer/npm依存監査が通る。

導入先で利用可能なcommandだけを実行し、未実行の検証を成功したと報告しません。完了時に変更file、利用可否・認可の判断、非公開file配信、privacy上の判断、検証結果を報告してください。
```
