import localStorage from 'ember-local-storage-decorator';
import { tracked } from '@glimmer/tracking';
import type { HTMLElementWithSource } from './modifier.ts';

export class SourceLensState {
  // Persistent state (survives page reloads)
  @localStorage('source-lens:projectRoot') projectRoot: string = '';
  @localStorage('source-lens:enabled') isEnabled: boolean = false;
  @localStorage('source-lens:selectedFile') selectedFile: string | null = null;
  @localStorage('source-lens:selectedLineNumber') selectedLineNumber:
    | number
    | null = null;
  @localStorage('source-lens:selectedColumn') selectedColumn: number | null =
    null;
  @localStorage('source-lens:editorEnabled') editorEnabled: boolean = false;

  // Transient state (resets on page reload)
  @tracked filePath: string | null = null;
  @tracked lineNumber: number | null = null;
  @tracked columnNumber: number | null = null;
  @tracked currentFileContent: string = '';
  @tracked overlayEnabled: boolean = false;
  @tracked element: HTMLElementWithSource | null = null;
  @tracked boundingClientRect: DOMRect | null = null;
  @tracked scrollDistance: number = 0;
  @tracked shouldFocusEditor: boolean = false;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot ?? '/';
  }

  get absolutePath() {
    const path = `${this.projectRoot}/${this.selectedFile}`;
    return path.replace(/\/+/g, '/');
  }

  toggleOverlay = () => {
    this.overlayEnabled = !this.overlayEnabled;
  };

  toggleEnabled = () => {
    this.isEnabled = !this.isEnabled;

    // Clear state when disabling
    if (!this.isEnabled) {
      this.element = null;
      this.boundingClientRect = null;
      this.scrollDistance = 0;
    }
  };

  toggleEditor = () => {
    this.editorEnabled = !this.editorEnabled;
    this.shouldFocusEditor = this.editorEnabled;
  };

  selectElement = () => {
    if (this.selectedFile !== this.filePath) this.selectedFile = this.filePath;
    this.selectedLineNumber = this.lineNumber;
    this.selectedColumn = this.columnNumber;
    this.overlayEnabled = false;
    this.boundingClientRect = null;
  };

  resetState = () => {
    this.element = null;
    this.filePath = null;
    this.lineNumber = null;
    this.columnNumber = null;
    this.boundingClientRect = null;
    this.selectedFile = null;
    this.selectedLineNumber = null;
    this.selectedColumn = null;
    this.currentFileContent = '';
    this.editorEnabled = false;
    this.overlayEnabled = false;
    this.scrollDistance = 0;
  };
}
