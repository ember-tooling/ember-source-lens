import { sourceLensModifier } from '#src/lib/modifier.ts';
import { SourceLensState } from '#src/lib/shared-state.ts';
import { concat } from '@ember/helper';
import { on } from '@ember/modifier';
import { htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import { createStore } from 'ember-primitives/store';
import { getEditorUrl, type EditorType } from '#src/lib/editor-url.ts';
import { FileSystemBridge } from '#src/lib/file-system-bridge.ts';
import { Editor } from './editor.gts';
import { EmberLogo, InspectIcon } from './icons.gts';
import {
  active,
  locationString,
  panel,
  panelAction,
  panelGroup,
  panelTitle,
  sourceCode,
  sourceLens,
  sourceLensOverlay,
} from './styles.module.css';

interface SourceLensSignature {
  Element: HTMLDivElement;
  Args: {
    projectRoot?: string;
    editor?: EditorType;
  };
}

export class SourceLens extends Component<SourceLensSignature> {
  sourceLensState = createStore(
    this,
    () => new SourceLensState(this.args.projectRoot),
  );

  fileSystemBridge = createStore(
    this,
    () => new FileSystemBridge(this.sourceLensState),
  );

  get hasHoveredFile() {
    return Boolean(
      this.sourceLensState.filePath &&
        this.sourceLensState.lineNumber &&
        this.sourceLensState.columnNumber,
    );
  }

  get hasSelectedFile() {
    return Boolean(
      this.sourceLensState.selectedFile &&
        this.sourceLensState.selectedLineNumber &&
        this.sourceLensState.selectedColumn,
    );
  }

  fullFilePath(path: string, line: number, column: number) {
    return `${path}:${line}:${column}`;
  }

  get locationString() {
    if (this.hasHoveredFile) {
      return this.fullFilePath(
        this.sourceLensState.filePath!,
        this.sourceLensState.lineNumber!,
        this.sourceLensState.columnNumber!,
      );
    }

    if (this.hasSelectedFile) {
      return this.fullFilePath(
        this.sourceLensState.selectedFile!,
        this.sourceLensState.selectedLineNumber!,
        this.sourceLensState.selectedColumn!,
      );
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
    this.fileSystemBridge.saveFile(newContent);
  };

  get editorUrl() {
    return getEditorUrl(
      this.args.editor || 'vscode',
      this.sourceLensState.absolutePath,
      this.sourceLensState.selectedLineNumber!,
      this.sourceLensState.selectedColumn!,
      this.sourceLensState.projectRoot,
    );
  }

  openIDE = () => {
    window.location.href = this.editorUrl;
  };

  <template>
    <div
      class={{sourceLens}}
      ...attributes
      {{sourceLensModifier
        sourceLensState=this.sourceLensState
        fileSystemBridge=this.fileSystemBridge
        sourceLensClass=sourceLens
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
              {{#if this.locationString}}
                <a href={{this.editorUrl}}>{{this.locationString}}</a>
              {{else}}
                No component selected
              {{/if}}
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

              {{#if this.fileSystemBridge.isConnected}}
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

            {{/if}}

          </div>

        </div>

        {{#if this.fileSystemBridge.isConnected}}
          {{#if this.sourceLensState.editorEnabled}}
            <Editor
              class={{sourceCode}}
              @sourceLensState={{this.sourceLensState}}
              @saveAction={{this.saveAction}}
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
