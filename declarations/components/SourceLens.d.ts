import Component from '@glimmer/component';
import { type EditorType } from '../lib/editor-url.ts';
import { FileSystemBridge } from '../lib/file-system-bridge.ts';
import { SourceLensState } from '../lib/shared-state.ts';
interface SourceLensSignature {
    Element: HTMLDivElement;
    Args: {
        projectRoot?: string;
        editor?: EditorType;
    };
}
export declare class SourceLens extends Component<SourceLensSignature> {
    sourceLensState: SourceLensState;
    fileSystemBridge: FileSystemBridge;
    get hasHoveredFile(): boolean;
    get hasSelectedFile(): boolean;
    fullFilePath(path: string, line: number, column: number): string;
    get locationString(): string;
    get overlayRectStyleString(): string;
    saveAction: (newContent: string) => void;
    get editorUrl(): string;
    openIDE: () => void;
}
export {};
//# sourceMappingURL=SourceLens.d.ts.map