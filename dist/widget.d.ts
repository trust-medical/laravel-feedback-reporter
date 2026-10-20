import { l as FeedbackReporterConfig } from "./types-Bv_lx0RT.js";
//#region resources/js/widget.d.ts
export type FeedbackReporterColorScheme = 'auto' | 'light' | 'dark';
export interface FeedbackReporterWidgetConfig {
  endpoint?: string;
  availabilityEndpoint?: string;
  sourceType?: string;
  routeName?: string | null;
  panelId?: string | null;
  reporter?: FeedbackReporterConfig;
}
declare const HTMLElementBase: typeof HTMLElement;
export declare class FeedbackReporterElement extends HTMLElementBase {
  private controller;
  private widgetConfig;
  /**
   * Programmatic configuration. Attributes take precedence over these values.
   * Assigning it after the element is connected rebuilds the widget, which discards
   * any draft in progress.
   */
  set config(config: FeedbackReporterWidgetConfig);
  get config(): FeedbackReporterWidgetConfig;
  connectedCallback(): void;
  /**
   * A `config` value assigned before the element was upgraded is stored as an own
   * property that shadows the accessor. Move it through the setter instead.
   */
  private upgradeConfigProperty;
  disconnectedCallback(): void;
  open(): Promise<void>;
  close(): void;
}
export declare function registerFeedbackReporterElement(tagName?: string): void;
//#endregion
export {};
//# sourceMappingURL=widget.d.ts.map