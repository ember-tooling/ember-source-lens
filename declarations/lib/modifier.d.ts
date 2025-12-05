import type { SourceLensState } from './shared-state.ts';
import type { FileSystemBridge } from './file-system-bridge.ts';
export type HTMLElementWithSource = HTMLElement & {
    sourceFile: string;
    sourceLine: string;
    sourceColumn: string;
};
export declare function isElementWithSource(element: Element): element is HTMLElementWithSource;
export declare function findSourceElement(x: number, y: number, excludeSelector: string): HTMLElementWithSource | null;
export declare function clearSourceLensDataAttributes(): void;
export declare const sourceLensModifier: import("ember-modifier").FunctionBasedModifier<{
    Args: {
        Positional: [];
        Named: {
            sourceLensState: SourceLensState;
            fileSystemBridge: FileSystemBridge;
            sourceLensClass: string;
        };
    };
    Element: HTMLElement;
}>;
//# sourceMappingURL=modifier.d.ts.map