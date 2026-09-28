import { F as FeedbackReporterConfig } from './types-BQIS2TNQ.js';

type FeedbackReporterColorScheme = 'auto' | 'light' | 'dark';
interface FeedbackReporterWidgetConfig {
    endpoint?: string;
    availabilityEndpoint?: string;
    sourceType?: string;
    routeName?: string | null;
    panelId?: string | null;
    reporter?: FeedbackReporterConfig;
}
declare const HTMLElementBase: typeof HTMLElement;
declare class FeedbackReporterElement extends HTMLElementBase {
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
declare function registerFeedbackReporterElement(tagName?: string): void;

export { type FeedbackReporterColorScheme, FeedbackReporterElement, type FeedbackReporterWidgetConfig, registerFeedbackReporterElement };
