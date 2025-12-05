import type { HTMLElementWithSource } from './modifier.ts';
export declare class SourceLensState {
    projectRoot: string;
    isEnabled: boolean;
    selectedFile: string | null;
    selectedLineNumber: number | null;
    selectedColumn: number | null;
    editorEnabled: boolean;
    filePath: string | null;
    lineNumber: number | null;
    columnNumber: number | null;
    currentFileContent: string;
    overlayEnabled: boolean;
    element: HTMLElementWithSource | null;
    boundingClientRect: DOMRect | null;
    scrollDistance: number;
    shouldFocusEditor: boolean;
    constructor(projectRoot?: string);
    get absolutePath(): string;
    toggleOverlay: () => void;
    toggleEnabled: () => void;
    toggleEditor: () => void;
    selectElement: () => void;
    resetState: () => void;
}
//# sourceMappingURL=shared-state.d.ts.map