import type { init } from 'modern-monaco';
import Modifier from 'ember-modifier';
import type { editor } from 'modern-monaco/editor-core';
import type { TOC } from '@ember/component/template-only';
import { assert } from '@ember/debug';
import type { SourceLensState } from '#src/lib/shared-state.ts';

interface MonacoEditorModifierSignature {
  Element: HTMLElement;
  Args: {
    Positional: [
      string | null,
      string | null,
      number | null,
      number | null,
      () => void,
      boolean,
      (value: string) => void,
    ];
  };
}

const languageMap: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  gts: 'glimmer-ts',
  gjs: 'glimmer-js',
  css: 'css',
  html: 'html',
  hbs: 'handlebars',
  txt: 'plaintext',
};

class MonacoEditor extends Modifier<MonacoEditorModifierSignature> {
  setupCalled = false;
  currentContent = '';
  declare editor: editor.IStandaloneCodeEditor;
  declare monaco: Awaited<ReturnType<typeof init>>;
  saveAction: (value: string) => void = () => {};
  disableAction: () => void = () => {};

  async setup(element: HTMLElement) {
    const init = await import('modern-monaco').then((mod) => mod.init);
    this.monaco = await init({
      theme: 'dark-plus',
    });

    this.editor = this.monaco.editor.create(element, {
      padding: {
        top: 10,
      },
    });

    this.monaco.editor.addEditorAction({
      id: 'save-action',
      label: 'Save File',
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS],
      run: (ed) => {
        this.saveAction(ed.getValue());
      },
    });

    this.monaco.editor.addEditorAction({
      id: 'disable',
      label: 'Disable Ember Source Lens',
      keybindings: [
        this.monaco.KeyMod.CtrlCmd |
          this.monaco.KeyMod.Shift |
          this.monaco.KeyCode.KeyL,
      ],
      run: () => {
        this.disableAction();
      },
    });
  }

  setContent(
    content: string,
    filename: string,
    lineNumber: number,
    columnNumber: number,
    focus: boolean,
  ) {
    const extension = filename.split('.').pop() || 'txt';
    const language = languageMap[extension] || 'plaintext';

    const currentModel = this.editor.getModel();
    assert('Monaco Editor model is not initialized', currentModel !== null);
    this.monaco.editor.setModelLanguage(currentModel, language);
    currentModel.setValue(content);
    this.editor.setPosition({ lineNumber, column: columnNumber });
    this.editor.revealLine(lineNumber + 10);
    if (focus) {
      this.editor.focus();
    }
  }

  modify(
    element: HTMLElement,
    [
      content,
      filename,
      lineNumber,
      columnNumber,
      disableAction,
      shouldFocusEditor,
      saveAction,
    ]: MonacoEditorModifierSignature['Args']['Positional'],
  ) {
    this.currentContent = content || '';
    this.saveAction = saveAction;
    this.disableAction = disableAction;

    if (this.editor) {
      if (this.currentContent && filename && lineNumber && columnNumber) {
        this.setContent(
          this.currentContent,
          filename,
          lineNumber,
          columnNumber,
          true,
        );
      }
      return;
    }

    if (this.setupCalled) {
      return;
    }

    this.setupCalled = true;

    this.setup(element)
      .then(() => {
        if (this.currentContent && filename && lineNumber && columnNumber) {
          this.setContent(
            this.currentContent,
            filename,
            lineNumber,
            columnNumber,
            shouldFocusEditor,
          );
        }
      })
      .catch((error) => {
        console.error('Error initializing Monaco Editor:', error);
      });
  }
}

interface EditorSignature {
  Element: HTMLDivElement;
  Args: {
    sourceLensState: SourceLensState;
    saveAction: (value: string) => void;
  };
}

export const Editor: TOC<EditorSignature> = <template>
  <div
    ...attributes
    {{MonacoEditor
      @sourceLensState.currentFileContent
      @sourceLensState.selectedFile
      @sourceLensState.selectedLineNumber
      @sourceLensState.selectedColumn
      @sourceLensState.toggleEnabled
      @sourceLensState.shouldFocusEditor
      @saveAction
    }}
  ></div>
</template>;
