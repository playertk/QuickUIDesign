import { IntentOperation } from "../content/intent-region";
import { RegionContext } from "../content/region-context";
export type IntentPromptOptions = {
    language: "en" | "zh";
    page: {
        url: string;
        title: string;
    };
};
export type IntentPromptInput = {
    operation: IntentOperation;
    sourceContext: RegionContext;
    targetContext?: RegionContext;
};
export type PromptBuildResult = {
    ok: true;
    prompt: string;
    hasMediaReplacement: boolean;
} | {
    ok: false;
    reason: "empty";
    message: string;
};
type PromptLanguage = IntentPromptOptions["language"];
export declare function appendContextBlock(lines: string[], label: string, context: RegionContext, indent?: string, language?: PromptLanguage): void;
export declare function appendRegionContents(lines: string[], context: RegionContext, indent?: string, isTargetB?: boolean, language?: PromptLanguage): void;
export declare function appendNearbyReferences(lines: string[], context: RegionContext, indent?: string, label?: string, language?: PromptLanguage): void;
export declare function extractStyleFacts(context: RegionContext): string[];
export declare function appendCssFacts(lines: string[], context: RegionContext, indent?: string, language?: PromptLanguage): void;
export declare function getMoveNote(input: IntentPromptInput): string;
export declare function contextHasImage(context: RegionContext): boolean;
export declare function appendIntentOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult?: boolean): boolean;
export declare function appendMoveOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult?: boolean): boolean;
export declare function appendRemoveOperation(lines: string[], input: IntentPromptInput, opId: string, skipExpectedResult?: boolean): boolean;
export declare function buildIntentPrompt(inputs: IntentPromptInput[], options: IntentPromptOptions): PromptBuildResult;
export {};
