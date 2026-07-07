import type { IntentAction } from "./intent-region";
export type IntentDraftVisualItem = {
    id: string;
    action: IntentAction;
    color: string;
    hasTarget?: boolean;
};
export type IntentDraftVisualPlan = {
    id: string;
    color: string;
    sourceLabel: string;
    targetLabel?: string;
};
export declare function pickNextIntentColor(usedColors: string[], palette: string[]): string;
export declare function buildIntentDraftVisualPlan(drafts: IntentDraftVisualItem[], removeBadgeLabel: string): IntentDraftVisualPlan[];
