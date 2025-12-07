import type { TOC } from '@ember/component/template-only';
import type { SourceLensState } from '../lib/shared-state.ts';
interface EditorSignature {
    Element: HTMLDivElement;
    Args: {
        sourceLensState: SourceLensState;
        saveAction: (value: string) => void;
    };
}
export declare const Editor: TOC<EditorSignature>;
export {};
//# sourceMappingURL=editor.d.ts.map