import Modifier from 'ember-modifier';
import { assert } from '@ember/debug';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

const languageMap = {
  js: 'javascript',
  ts: 'typescript',
  gts: 'glimmer-ts',
  gjs: 'glimmer-js',
  css: 'css',
  html: 'html',
  hbs: 'handlebars',
  txt: 'plaintext'
};
class MonacoEditor extends Modifier {
  setupCalled = false;
  currentContent = '';
  saveAction = () => {};
  disableAction = () => {};
  async setup(element) {
    const init = await import('modern-monaco').then(mod => mod.init);
    this.monaco = await init({
      theme: 'dark-plus'
    });
    this.editor = this.monaco.editor.create(element, {
      padding: {
        top: 10
      }
    });
    this.monaco.editor.addEditorAction({
      id: 'save-action',
      label: 'Save File',
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS],
      run: ed => {
        this.saveAction(ed.getValue());
      }
    });
    this.monaco.editor.addEditorAction({
      id: 'disable',
      label: 'Disable Ember Source Lens',
      keybindings: [this.monaco.KeyMod.CtrlCmd | this.monaco.KeyMod.Shift | this.monaco.KeyCode.KeyL],
      run: () => {
        this.disableAction();
      }
    });
  }
  setContent(content, filename, lineNumber, columnNumber, focus) {
    const extension = filename.split('.').pop() || 'txt';
    const language = languageMap[extension] || 'plaintext';
    const currentModel = this.editor.getModel();
    assert('Monaco Editor model is not initialized', currentModel !== null);
    this.monaco.editor.setModelLanguage(currentModel, language);
    currentModel.setValue(content);
    this.editor.setPosition({
      lineNumber,
      column: columnNumber
    });
    this.editor.revealLine(lineNumber + 10);
    if (focus) {
      this.editor.focus();
    }
  }
  modify(element, [content, filename, lineNumber, columnNumber, disableAction, shouldFocusEditor, saveAction]) {
    this.currentContent = content || '';
    this.saveAction = saveAction;
    this.disableAction = disableAction;
    if (this.editor) {
      if (this.currentContent && filename && lineNumber && columnNumber) {
        this.setContent(this.currentContent, filename, lineNumber, columnNumber, true);
      }
      return;
    }
    if (this.setupCalled) {
      return;
    }
    this.setupCalled = true;
    this.setup(element).then(() => {
      if (this.currentContent && filename && lineNumber && columnNumber) {
        this.setContent(this.currentContent, filename, lineNumber, columnNumber, shouldFocusEditor);
      }
    }).catch(error => {
      console.error('Error initializing Monaco Editor:', error);
    });
  }
}
const Editor = setComponentTemplate(precompileTemplate("\n  <div ...attributes {{MonacoEditor @sourceLensState.currentFileContent @sourceLensState.selectedFile @sourceLensState.selectedLineNumber @sourceLensState.selectedColumn @sourceLensState.toggleEnabled @sourceLensState.shouldFocusEditor @saveAction}}></div>\n", {
  strictMode: true,
  scope: () => ({
    MonacoEditor
  })
}), templateOnly());

export { Editor };
//# sourceMappingURL=editor.js.map
