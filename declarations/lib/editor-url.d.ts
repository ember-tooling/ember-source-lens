export type EditorType = 'vscode' | 'code' | 'webstorm' | 'intellij' | 'atom' | 'sublime' | 'sublimetext' | 'cursor' | 'windsurf';
/**
 * Generates an editor-specific URL to open a file at a specific location.
 *
 * @param editor - The editor type
 * @param absolutePath - The absolute file path
 * @param lineNumber - The line number to navigate to
 * @param column - The column number to navigate to
 * @param projectRoot - Optional project root for certain editors
 * @returns The editor-specific URL
 */
export declare function getEditorUrl(editor: EditorType, absolutePath: string, lineNumber: number, column: number, projectRoot?: string): string;
//# sourceMappingURL=editor-url.d.ts.map