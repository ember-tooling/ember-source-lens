import type { SourceLensState } from './shared-state';
export declare class FileSystemBridge {
    private sourceLensState;
    isConnected: boolean;
    constructor(sourceLensState: SourceLensState);
    private setup;
    openFile(absolutePath: string): void;
    saveFile(content: string): void;
}
//# sourceMappingURL=file-system-bridge.d.ts.map