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

const EmberLogo = <template>
  <svg
    width="24"
    height="24"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    ...attributes
  >
    <g fill="none" fill-rule="evenodd">
      <path
        d="M64 0c35.346 0 64 28.654 64 64 0 35.346-28.654 64-64 64-35.346 0-64-28.654-64-64C0 28.654 28.654 0 64 0z"
        fill="#E05C43"
        fill-rule="nonzero"
      />
      <path
        d="M65.265 24.128c8.246-.163 14.073 2.073 19.087 9.19 10.934 27.109-28.147 41.1-29.714 41.65l-.049.016s-1.18 7.363 10.028 7.08c13.793 0 28.294-10.691 33.81-15.21a3.293 3.293 0 0 1 4.468.265l4.13 4.29a3.291 3.291 0 0 1 .085 4.491c-3.59 3.997-12.014 12.203-24.696 17.504 0 0-21.16 9.798-35.42.52-8.503-5.53-10.842-12.151-11.793-19.038.005 0-10.324-.524-16.957-3.114-6.635-2.592.049-10.411.049-10.411s2.04-3.233 5.92 0c3.883 3.228 11.13 1.772 11.13 1.772.646-5.099 1.72-11.828 4.884-18.93 6.632-14.885 16.789-19.915 25.038-20.075zm4.853 14.915c-4.369-4.21-16.984 4.202-17.471 23.45 0 0 3.724 1.134 11.97-4.53 8.25-5.661 9.87-14.718 5.501-18.92z"
        fill="#FFFFFF"
      />
    </g>
  </svg>
</template>;

const InspectIcon = <template>
  <svg
    width="17"
    height="16"
    viewBox="0 0 17 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12.9013 5.30147L12.9072 2.18288C12.9072 2.01065 12.7728 1.87104 12.6071 1.87104H2.10607C1.94037 1.87104 1.80604 2.01066 1.80604 2.18288L1.80018 11.8499L1.80604 11.9127C1.83403 12.0547 1.95523 12.1618 2.10021 12.1618H5.10638C5.60349 12.1618 6.00647 12.5806 6.00647 13.0973C6.00637 13.6139 5.60342 14.0328 5.10638 14.0328H2.10021C0.976527 14.0328 0.0591503 13.1154 0.00292999 11.962L0 11.8499L0.00585997 2.18288C0.00585997 0.977309 0.946158 0 2.10607 0H12.6071C13.7671 0 14.7074 0.97731 14.7074 2.18288L14.7015 5.30147C14.7014 5.81806 14.2985 6.23699 13.8014 6.23699C13.3044 6.23696 12.9014 5.81803 12.9013 5.30147Z"
      fill="#000"
    />
    <path
      d="M13.9146 12.5063L13.3849 13.0569C13.1551 13.2957 12.7826 13.2957 12.5529 13.0569L10.8218 11.2577C10.7679 11.2017 10.6758 11.2282 10.6573 11.305L10.2563 12.9722C10.1157 13.5567 9.33229 13.5998 9.1331 13.034L6.82265 6.47015C6.65064 5.98148 7.10712 5.50704 7.57728 5.68582L13.8925 8.08721C14.437 8.29424 14.3955 9.10852 13.8331 9.25466L12.2291 9.67145C12.1551 9.69066 12.1296 9.78637 12.1835 9.84238L13.9146 11.6416C14.1443 11.8804 14.1443 12.2675 13.9146 12.5063Z"
      fill="#000"
    />
  </svg>
</template>;

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
    console.log('[Ember Source Lens] Toggling source lens state');
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
    console.log('[Ember Source Lens] Resetting source lens state');
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
      e.preventDefault();
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

    try {
      document.addEventListener('mousemove', moveHandler, { signal });
      document.addEventListener('mouseup', clickElementHandler, { signal });
      document.addEventListener('scroll', scrollHandler, { signal });
      document.addEventListener('keydown', keyHandler, { signal });
    } catch (error) {
      console.warn('[Ember Source Lens] Error adding event listeners:', error);
      return;
    }

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
        console.log('[Ember Source Lens] Vite WS system connected');
        this.fileSystemConnected = true;

        if (this.sourceLensState.selectedFile) {
          const absolutePath = this.absolutePath;

          import.meta.hot?.send('source-lens:open-file', { absolutePath });
        }
      });

      import.meta.hot.on(
        'source-lens:file-response',
        (data: { file: string }) => {
          console.log(
            '[Ember Source Lens] Received file content from Vite plugin',
          );
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
    console.log('[Ember Source Lens] Save action triggered');

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
    console.log('[Ember Source Lens] Open in IDE action triggered');

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
