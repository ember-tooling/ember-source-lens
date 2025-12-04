import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import { tracked } from '@glimmer/tracking';
import { createStore } from 'ember-primitives/store';
import { htmlSafe } from '@ember/template';
import {
  sourceLens,
  sourceLensOverlay,
  panel,
  sourceCode,
  locationString,
  panelAction,
  panelTitle,
  panelGroup,
  active,
} from './styles.module.css';
import type Owner from '@ember/owner';
import localStorage from 'ember-local-storage-decorator';
import { on } from '@ember/modifier';
import { Editor } from './editor.gts';
import { concat } from '@ember/helper';
import { EmberLogo, InspectIcon } from './icons.gts';

interface SourceLensSignature {
  Element: HTMLDivElement;
  Args: {
    projectRoot?: string;
    editor?:
      | 'vscode'
      | 'code'
      | 'webstorm'
      | 'intellij'
      | 'atom'
      | 'sublime'
      | 'sublimetext'
      | 'cursor'
      | 'windsurf';
  };
}

class SourceLensState {
  @localStorage('source-lens:enabled') isEnabled: boolean = false;
  @localStorage('source-lens:filePath') filePath: string | null = null;
  @localStorage('source-lens:lineNumber') lineNumber: number | null = null;
  @localStorage('source-lens:columnNumber') columnNumber: number | null = null;
  @localStorage('source-lens:currentFileContent') currentFileContent: string =
    '';
  @localStorage('source-lens:selectedFile') selectedFile: string | null = null;
  @localStorage('source-lens:selectedLineNumber') selectedLineNumber:
    | number
    | null = null;
  @localStorage('source-lens:selectedColumn') selectedColumn: number | null =
    null;
  @localStorage('source-lens:editorEnabled') editorEnabled: boolean = false;

  @tracked overlayEnabled: boolean = false;
  @tracked element: HTMLElementWithSource | null = null;
  @tracked boundingClientRect: DOMRect | null = null;
  @tracked scrollDistance: number = 0;
  @tracked shouldFocusEditor: boolean = false;

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

    if (this.editorEnabled) {
      this.shouldFocusEditor = true;
    } else {
      this.shouldFocusEditor = false;
    }
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

type HTMLElementWithSource = HTMLElement & {
  sourceFile: string;
  sourceLine: string;
  sourceColumn: string;
};

function isElementWithSource(
  element: Element,
): element is HTMLElementWithSource {
  return 'sourceFile' in element && 'sourceLine' in element;
}

function clearSourceLensDataAttributes() {
  const elsWithLens =
    document.querySelectorAll<HTMLElementWithSource>('[data-source-file]');

  elsWithLens.forEach((el) => {
    const element = el;
    element.sourceFile = element.getAttribute('data-source-file') || '';
    element.sourceLine = element.getAttribute('data-source-line') || '';
    element.sourceColumn = element.getAttribute('data-source-column') || '';
    element.removeAttribute('data-source-line');
    element.removeAttribute('data-source-file');
    element.removeAttribute('data-source-column');
  });
}

const sourceLensModifier = modifier(
  (
    _element: HTMLElement,
    _positional: [],
    named: { projectRoot?: string; sourceLensState?: SourceLensState },
  ) => {
    const { projectRoot, sourceLensState } = named;

    if (!projectRoot || !sourceLensState) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    clearSourceLensDataAttributes();
    const observer = new MutationObserver(() => {
      clearSourceLensDataAttributes();
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });

    const moveHandler = (e: MouseEvent) => {
      if (!sourceLensState.isEnabled) return;
      if (!sourceLensState.overlayEnabled) return;

      try {
        const el = document.elementFromPoint(e.clientX, e.clientY);

        if (!el || el?.closest(`.${sourceLens}`) || !isElementWithSource(el)) {
          sourceLensState.element = null;
          sourceLensState.filePath = null;
          sourceLensState.lineNumber = null;
          sourceLensState.columnNumber = null;
          sourceLensState.boundingClientRect = null;
          return;
        }

        if (el === sourceLensState.element) return;

        sourceLensState.element = el;
        sourceLensState.filePath = el.sourceFile;
        sourceLensState.lineNumber = Number(el.sourceLine);
        sourceLensState.columnNumber = Number(el.sourceColumn) || 1;
        sourceLensState.scrollDistance = 0;
        sourceLensState.boundingClientRect = el
          ? el.getBoundingClientRect()
          : null;
      } catch (error) {
        console.warn('[Ember Source Lens] Error in move handler:', error);
      }
    };

    const clickElementHandler = (e: MouseEvent) => {
      absorbClicks(e);
      if (!sourceLensState.isEnabled) return;
      if (!sourceLensState.overlayEnabled) return;
      if (!sourceLensState.element) return;

      const absolutePath = `${projectRoot}/${sourceLensState.filePath}`.replace(
        '///',
        '/',
      );
      const lineNumber = sourceLensState.lineNumber;

      if (sourceLensState.selectedLineNumber !== lineNumber) {
        sourceLensState.selectedLineNumber = lineNumber;
      }

      if (sourceLensState.selectedColumn !== sourceLensState.columnNumber) {
        sourceLensState.selectedColumn = sourceLensState.columnNumber;
      }

      if (sourceLensState.selectedFile !== sourceLensState.filePath) {
        sourceLensState.selectedFile = sourceLensState.filePath;
        if (import.meta.hot) {
          import.meta.hot.send('source-lens:open-file', { absolutePath });
        }
      }

      sourceLensState.overlayEnabled = false;
      sourceLensState.boundingClientRect = null;

      // window.location.href = `vscode://file${absolutePath}:${lineNumber}`;
    };

    let lastKnownScrollPosition = 0;
    const scrollHandler = () => {
      const scrollElement = document.documentElement;
      const scrollDistance = scrollElement.scrollTop - lastKnownScrollPosition;
      lastKnownScrollPosition = scrollElement.scrollTop;

      // apply transform to overlay
      if (sourceLensState.boundingClientRect) {
        sourceLensState.scrollDistance -= scrollDistance;
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'l'
      ) {
        e.preventDefault();
        sourceLensState.toggleEnabled();
        sourceLensState.resetState();
      }
    };

    const absorbClicks = (e: MouseEvent) => {
      if (!sourceLensState.isEnabled) return;
      if (!sourceLensState.overlayEnabled) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    };

    document.addEventListener('keydown', keyHandler, { signal });
    document.addEventListener('scroll', scrollHandler, { signal });
    document.addEventListener('mousemove', moveHandler, { signal });
    document.addEventListener('click', clickElementHandler, {
      capture: true,
      signal,
    });
    document.addEventListener('mousedown', absorbClicks, {
      capture: true,
      signal,
    });

    return () => {
      abortController.abort();
      observer.disconnect();
    };
  },
);

export class SourceLens extends Component<SourceLensSignature> {
  @tracked fileSystemConnected: boolean = false;

  constructor(owner: Owner, args: SourceLensSignature['Args']) {
    super(owner, args);

    if (import.meta.hot) {
      import.meta.hot.send('source-lens:check-connection');

      import.meta.hot.on('source-lens:connected', () => {
        this.fileSystemConnected = true;

        if (this.sourceLensState.selectedFile) {
          const absolutePath = this.absolutePath;

          import.meta.hot?.send('source-lens:open-file', { absolutePath });
        }
      });

      import.meta.hot.on(
        'source-lens:file-response',
        (data: { file: string }) => {
          this.sourceLensState.currentFileContent = data.file;
        },
      );
    }
  }

  get projectRoot(): string {
    return this.args.projectRoot ?? '';
  }

  get sourceLensState() {
    return createStore(this, SourceLensState);
  }

  get locationString() {
    if (
      this.sourceLensState.filePath &&
      this.sourceLensState.lineNumber &&
      this.sourceLensState.columnNumber
    ) {
      return `${this.sourceLensState.filePath}:${this.sourceLensState.lineNumber}:${this.sourceLensState.columnNumber ?? 1}`;
    }

    if (
      this.sourceLensState.selectedFile &&
      this.sourceLensState.selectedLineNumber &&
      this.sourceLensState.selectedColumn
    ) {
      return `${this.sourceLensState.selectedFile}:${this.sourceLensState.selectedLineNumber}:${this.sourceLensState.selectedColumn}`;
    }

    return '';
  }

  get overlayRectStyleString() {
    const rect = this.sourceLensState.boundingClientRect;
    if (!rect) {
      return '';
    }
    return `top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px; transform: translateY(${this.sourceLensState.scrollDistance}px);`;
  }

  saveAction = (newContent: string) => {
    this.sourceLensState.currentFileContent = newContent;

    if (import.meta.hot) {
      import.meta.hot.send('source-lens:save-file', {
        content: newContent,
      });
    }
  };

  get absolutePath() {
    return `${this.projectRoot}/${this.sourceLensState.selectedFile}`.replace(
      '///',
      '/',
    );
  }

  get editorUrl() {
    const editor = this.args.editor || 'vscode';
    const absolutePath = this.absolutePath;
    const lineNumber = this.sourceLensState.selectedLineNumber;
    const column = this.sourceLensState.selectedColumn;
    const projectRoot = this.args.projectRoot;

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

  openIDE = () => {
    window.location.href = this.editorUrl;
  };

  <template>
    <div
      class={{sourceLens}}
      ...attributes
      {{sourceLensModifier
        projectRoot=this.projectRoot
        sourceLensState=this.sourceLensState
      }}
    >
      {{#if this.sourceLensState.isEnabled}}
        <div class={{panel}}>
          <div class={{panelGroup}}>
            <a
              href="https://github.com/ember-tooling/ember-source-lens"
              target="_blank"
              rel="noopener noreferrer"
              class={{panelTitle}}
            >
              <EmberLogo />
              Source Lens
            </a>
            <button
              type="button"
              class={{concat
                panelAction
                " "
                (if this.sourceLensState.overlayEnabled active)
              }}
              {{on "click" this.sourceLensState.toggleOverlay}}
            >
              <InspectIcon />
            </button>
          </div>
          <div class={{locationString}}>
            <span>
              {{if
                this.locationString
                this.locationString
                "No component selected"
              }}
            </span>
          </div>
          <div class={{panelGroup}}>
            {{#if this.sourceLensState.selectedFile}}

              <button
                type="button"
                class={{panelAction}}
                {{on "click" this.openIDE}}
              >
                Open in IDE
              </button>

              {{#if this.fileSystemConnected}}
                <button
                  type="button"
                  class={{concat
                    panelAction
                    " "
                    (if this.sourceLensState.editorEnabled active)
                  }}
                  {{on "click" this.sourceLensState.toggleEditor}}
                >
                  Inline Editor
                </button>
              {{/if}}

              <button
                type="button"
                class={{panelAction}}
                {{on "click" this.sourceLensState.resetState}}
              >
                Clear State
              </button>

            {{/if}}

          </div>

        </div>

        {{#if this.fileSystemConnected}}
          {{#if this.sourceLensState.editorEnabled}}
            <Editor
              class={{sourceCode}}
              @content={{this.sourceLensState.currentFileContent}}
              @filepath={{this.sourceLensState.selectedFile}}
              @lineNumber={{this.sourceLensState.selectedLineNumber}}
              @columnNumber={{this.sourceLensState.selectedColumn}}
              @saveAction={{this.saveAction}}
              @disableAction={{this.sourceLensState.toggleEnabled}}
              @shouldFocusEditor={{this.sourceLensState.shouldFocusEditor}}
            />
          {{/if}}
        {{/if}}

        {{#if this.sourceLensState.overlayEnabled}}
          <div
            class={{sourceLensOverlay}}
            style={{htmlSafe this.overlayRectStyleString}}
          ></div>
        {{/if}}
      {{/if}}
    </div>
  </template>
}
