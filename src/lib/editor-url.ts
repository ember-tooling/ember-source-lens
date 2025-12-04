export type EditorType =
  | 'vscode'
  | 'code'
  | 'webstorm'
  | 'intellij'
  | 'atom'
  | 'sublime'
  | 'sublimetext'
  | 'cursor'
  | 'windsurf';

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
export function getEditorUrl(
  editor: EditorType,
  absolutePath: string,
  lineNumber: number,
  column: number,
  projectRoot?: string,
): string {
  switch (editor.toLowerCase()) {
    case 'vscode':
    case 'code':
      return `vscode://file${absolutePath}:${lineNumber}:${column}`;

    case 'webstorm':
    case 'intellij':
      return `jetbrains://idea/navigate/reference?project=${projectRoot || 'project'}&path=${absolutePath}&line=${lineNumber}&column=${column}`;

    case 'atom':
      return `atom://core/open/file?file=${encodeURIComponent(absolutePath)}&line=${lineNumber}&column=${column}`;

    case 'sublime':
    case 'sublimetext':
      return `subl://open?url=file://${encodeURIComponent(absolutePath)}&line=${lineNumber}&column=${column}`;

    case 'cursor':
      return `cursor://file${absolutePath}:${lineNumber}:${column}`;

    case 'windsurf':
      return `windsurf://file${absolutePath}:${lineNumber}:${column}`;

    default:
      console.warn(
        `[Ember Source Lens] Unknown editor "${editor}", falling back to VS Code`,
      );
      return `vscode://file${absolutePath}:${lineNumber}:${column}`;
  }
}
