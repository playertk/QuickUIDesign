import type { EditorPatch } from "../state/editor-state";
import { type IntentPromptInput, type IntentPromptOptions, type PromptBuildResult } from "./intent-prompt";
export declare function buildUnifiedPrompt(patches: EditorPatch[], intents: IntentPromptInput[], options: IntentPromptOptions): PromptBuildResult;
