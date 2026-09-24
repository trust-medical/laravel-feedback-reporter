import { F as FeedbackReporterConfig } from './types-C4xd_kpc.js';

type FeedbackReporterColorScheme = 'auto' | 'light' | 'dark';
interface FeedbackReporterWidgetConfig {
    endpoint?: string;
    availabilityEndpoint?: string;
    sourceType?: string;
    routeName?: string | null;
    panelId?: string | null;
    reporter?: FeedbackReporterConfig;
}
declare class FeedbackReporterElement extends HTMLElement {
    private controller;
    private widgetConfig;
    set config(config: FeedbackReporterWidgetConfig);
    get config(): FeedbackReporterWidgetConfig;
    connectedCallback(): void;
    disconnectedCallback(): void;
    open(): Promise<void>;
    close(): void;
}
declare function registerFeedbackReporterElement(tagName?: string): void;

export { type FeedbackReporterColorScheme, FeedbackReporterElement, type FeedbackReporterWidgetConfig, registerFeedbackReporterElement };
