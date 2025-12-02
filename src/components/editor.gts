import { init } from 'modern-monaco';
import Modifier from 'ember-modifier';
import type { editor } from 'modern-monaco/editor-core';
import type { TOC } from '@ember/component/template-only';
import { assert } from '@ember/debug';

interface MonacoEditorModifierSignature {
  Element: HTMLElement;
  Args: {
    Positional: [
      string | null,
      string | null,
      number | null,
      number | null,
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
  declare editor: editor.IStandaloneCodeEditor;
  declare monaco: Awaited<ReturnType<typeof init>>;
  saveAction: (value: string) => void = () => {};

  async setup(element: HTMLElement) {
    this.monaco = await init({
      theme: 'vitesse-dark',
    });

    this.editor = this.monaco.editor.create(element);

    this.monaco.editor.addEditorAction({
      id: 'save-action',
      label: 'Save File',
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS],
      run: (ed) => {
        this.saveAction(ed.getValue());
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
      saveAction,
    ]: MonacoEditorModifierSignature['Args']['Positional'],
  ) {
    this.saveAction = saveAction;
    if (this.editor) {
      if (content && filename && lineNumber && columnNumber) {
        this.setContent(content, filename, lineNumber, columnNumber, true);
      }
      return;
    }
    this.setup(element)
      .then(() => {
        if (content && filename && lineNumber && columnNumber) {
          this.setContent(content, filename, lineNumber, columnNumber, false);
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
    content: string | null;
    filepath: string | null;
    lineNumber: number | null;
    columnNumber: number | null;
    saveAction: (value: string) => void;
  };
}

export const Editor = <template>
  <div
    ...attributes
    {{MonacoEditor @content @filepath @lineNumber @columnNumber @saveAction}}
  ></div>
</template> satisfies TOC<EditorSignature>;
