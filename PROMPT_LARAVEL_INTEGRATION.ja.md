# Laravel Feedback Reporter v4 導入プロンプト

以下をAIコーディングアシスタントへの依頼文、または実装チェックリストとして利用してください。

```markdown
# Laravel Feedback Reporter v4を導入する

このLaravelアプリケーションへ `trust-medical/laravel-feedback-reporter` を導入してください。v4はメッセージを必須とし、利用者がパソコンや携帯で撮影したスクリーンショットをアップロードする方式です。DOMの自動画像化は実装しないでください。

## 最初に確認すること

編集前に次を確認してください。

- PHP 8.3以上とfileinfo、json、mbstring、PDO
- Laravel 12または13
- Composer 2
- CHAR(26) ULIDとJSONを扱えるデータベース
- 公式Widgetまたはheadless SDKをbundleする場合はNode.js 20以上
- 既存の認証、frontend、管理画面、storage、認可、testの規約

不足要件がある場合は、依存を追加する前に報告してください。

## バックエンド

1. `trust-medical/laravel-feedback-reporter` をインストールする。
2. configとmigrationをpublishし、migrateする。
3. パッケージを有効化して利用制限を設定する。認証・認可要件を維持し、添付には非公開diskを使う。
4. パッケージrouteを利用するか、プロジェクトのmiddlewareを適用した同等routeを登録する。
5. 必要なら非公開添付用の認可済みpreview/download endpointを追加する。
6. `TrustMedical\FeedbackReporter\Events\FeedbackStored` を購読し、commit後の通知をqueueへ送る。
7. 管理UIがある場合は、その規約に沿った読み取り専用の一覧・詳細画面を追加する。

## フロントエンド

インストール:

```bash
npm install @trust-medical/feedback-reporter
```

公式の隔離Widgetを優先します。

```ts
import { registerFeedbackReporterElement } from '@trust-medical/feedback-reporter/widget'

registerFeedbackReporterElement()
```

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

依頼された一般画面・管理画面の共通layoutへ配置します。programmaticな設定は要素を接続する前に `config` propertyへ渡します。Widgetはopen Shadow DOM内にCSSを同梱するため、Tailwindや導入先CSSを追加しません。

Shadow DOMは意図しないstyle・selector競合を防ぎます。同じページ上で動く悪意あるJavaScriptに対するsecurity boundaryではありません。

独自UIが必要な場合は `createFeedbackReporter()` またはAlpine adapterを使います。messageは必須、画像は任意です。利用者が作成したPNG/JPEG/WebPをsource `user_screenshot` または `attachment` で送信します。

## 診断情報とプライバシー

別要件がなければWidgetの既定値を使います。console、fetch、XHR、breadcrumbの継続監視は、明示的に承認されない限り無効のままにします。有効化する場合はprivacyとglobal wrapperへの影響を文書化します。error監視はキャンセルしないevent listenerを使います。

password、Cookie、Authorization header、CSRF token、request/response body、無制限のbrowser storageを収集しません。custom metadataにも個人情報を入れないでください。

## 受け入れ確認

- 利用可否がauth/environment/policy設定に従う。
- 画像なしでもmessageを送信できる。
- 手動撮影した1枚以上のスクリーンショットをuploadして送信できる。
- zoom、全体表示、四角、矢印、Undo、削除、画像切り替えが動く。
- 一般画面と管理画面でWidgetが動く。
- host CSSが内部controlへ作用せず、Widget CSSも外へ漏れない。
- mobileでcontrolが折り返され、画像editorをscrollできる。
- 自動captureの依存、code、表示文言、CORS workaroundが残っていない。
- 非公開添付の閲覧に認可が必要である。
- PHP test、PHPStan、Pint、frontend test、format、typecheck、production build、依存監査が通る。

完了時に変更ファイル、security上の判断、検証結果を報告してください。
```
