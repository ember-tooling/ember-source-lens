import { concat } from '@ember/helper';
import { on } from '@ember/modifier';
import { htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import { createStore } from 'ember-primitives/store';
import { tracked } from '@glimmer/tracking';
import { g, i } from 'decorator-transforms/runtime-esm';
import Modifier, { modifier } from 'ember-modifier';
import localStorage from 'ember-local-storage-decorator';
import { assert } from '@ember/debug';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

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
function getEditorUrl(editor, absolutePath, lineNumber, column, projectRoot) {
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
      console.warn(`[Ember Source Lens] Unknown editor "${editor}", falling back to VS Code`);
      return `vscode://file${absolutePath}:${lineNumber}:${column}`;
  }
}

class FileSystemBridge {
  static {
    g(this.prototype, "isConnected", [tracked], function () {
      return false;
    });
  }
  #isConnected = (i(this, "isConnected"), void 0);
  constructor(sourceLensState) {
    this.sourceLensState = sourceLensState;
    this.setup();
  }
  setup() {
    if (!import.meta.hot) return;
    import.meta.hot.send('source-lens:check-connection');
    import.meta.hot.on('source-lens:connected', () => {
      this.isConnected = true;
      if (this.sourceLensState.selectedFile) {
        this.openFile(this.sourceLensState.absolutePath);
      }
    });
    import.meta.hot.on('source-lens:file-response', data => {
      this.sourceLensState.currentFileContent = data.file;
    });
  }
  openFile(absolutePath) {
    if (!import.meta.hot) return;
    import.meta.hot.send('source-lens:open-file', {
      absolutePath
    });
  }
  saveFile(content) {
    if (!import.meta.hot) return;
    import.meta.hot.send('source-lens:save-file', {
      content
    });
  }
}

function isElementWithSource(element) {
  return 'sourceFile' in element && 'sourceLine' in element;
}
function findSourceElement(x, y, excludeSelector) {
  const el = document.elementFromPoint(x, y);
  if (!el || el.closest(excludeSelector) || !isElementWithSource(el)) {
    return null;
  }
  return el;
}
function clearSourceLensDataAttributes() {
  const elsWithLens = document.querySelectorAll('[data-source-file]');
  elsWithLens.forEach(el => {
    el.sourceFile = el.getAttribute('data-source-file') || '';
    el.sourceLine = el.getAttribute('data-source-line') || '';
    el.sourceColumn = el.getAttribute('data-source-column') || '';
    el.removeAttribute('data-source-line');
    el.removeAttribute('data-source-file');
    el.removeAttribute('data-source-column');
  });
}
const HTML_CLASS = '_esl_active_';
const sourceLensModifier = modifier((_element, _positional, named) => {
  const {
    sourceLensState,
    fileSystemBridge,
    sourceLensClass
  } = named;
  if (!sourceLensState) {
    return;
  }
  const existingPadding = getComputedStyle(document.documentElement).getPropertyValue('padding-bottom');
  document.documentElement.style.setProperty('--esl-existing-padding', existingPadding);
  document.documentElement.classList.add(HTML_CLASS);
  const abortController = new AbortController();
  const {
    signal
  } = abortController;
  clearSourceLensDataAttributes();
  const observer = new MutationObserver(() => {
    clearSourceLensDataAttributes();
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
  const moveHandler = e => {
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    const el = findSourceElement(e.clientX, e.clientY, `.${sourceLensClass}`);
    if (!el) {
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
    sourceLensState.boundingClientRect = el.getBoundingClientRect();
  };
  const clickElementHandler = e => {
    absorbClicks(e);
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    if (!sourceLensState.element) return;
    sourceLensState.selectElement();
    if (fileSystemBridge.isConnected) {
      fileSystemBridge.openFile(sourceLensState.absolutePath);
    } else {
      console.warn('[ember-source-lens] Cannot open file, file system bridge is not connected');
    }
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
  const absorbClicks = e => {
    if (!sourceLensState.element) return;
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
  };
  const keyHandler = e => {
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      sourceLensState.toggleEnabled();
      sourceLensState.resetState();
    }
  };
  document.addEventListener('keydown', keyHandler, {
    signal
  });
  document.addEventListener('scroll', scrollHandler, {
    signal
  });
  document.addEventListener('mousemove', moveHandler, {
    signal
  });
  document.addEventListener('click', clickElementHandler, {
    capture: true,
    signal
  });
  document.addEventListener('mousedown', absorbClicks, {
    capture: true,
    signal
  });
  return () => {
    abortController.abort();
    observer.disconnect();
    document.documentElement.classList.remove(HTML_CLASS);
  };
});

class SourceLensState {
  static {
    g(this.prototype, "projectRoot", [localStorage('source-lens:projectRoot')], function () {
      return '';
    });
  }
  #projectRoot = (i(this, "projectRoot"), void 0); // Persistent state (survives page reloads)
  static {
    g(this.prototype, "isEnabled", [localStorage('source-lens:enabled')], function () {
      return false;
    });
  }
  #isEnabled = (i(this, "isEnabled"), void 0);
  static {
    g(this.prototype, "selectedFile", [localStorage('source-lens:selectedFile')], function () {
      return null;
    });
  }
  #selectedFile = (i(this, "selectedFile"), void 0);
  static {
    g(this.prototype, "selectedLineNumber", [localStorage('source-lens:selectedLineNumber')], function () {
      return null;
    });
  }
  #selectedLineNumber = (i(this, "selectedLineNumber"), void 0);
  static {
    g(this.prototype, "selectedColumn", [localStorage('source-lens:selectedColumn')], function () {
      return null;
    });
  }
  #selectedColumn = (i(this, "selectedColumn"), void 0);
  static {
    g(this.prototype, "editorEnabled", [localStorage('source-lens:editorEnabled')], function () {
      return false;
    });
  }
  #editorEnabled = (i(this, "editorEnabled"), void 0);
  static {
    g(this.prototype, "filePath", [tracked], function () {
      return null;
    });
  }
  #filePath = (i(this, "filePath"), void 0); // Transient state (resets on page reload)
  static {
    g(this.prototype, "lineNumber", [tracked], function () {
      return null;
    });
  }
  #lineNumber = (i(this, "lineNumber"), void 0);
  static {
    g(this.prototype, "columnNumber", [tracked], function () {
      return null;
    });
  }
  #columnNumber = (i(this, "columnNumber"), void 0);
  static {
    g(this.prototype, "currentFileContent", [tracked], function () {
      return '';
    });
  }
  #currentFileContent = (i(this, "currentFileContent"), void 0);
  static {
    g(this.prototype, "overlayEnabled", [tracked], function () {
      return false;
    });
  }
  #overlayEnabled = (i(this, "overlayEnabled"), void 0);
  static {
    g(this.prototype, "element", [tracked], function () {
      return null;
    });
  }
  #element = (i(this, "element"), void 0);
  static {
    g(this.prototype, "boundingClientRect", [tracked], function () {
      return null;
    });
  }
  #boundingClientRect = (i(this, "boundingClientRect"), void 0);
  static {
    g(this.prototype, "scrollDistance", [tracked], function () {
      return 0;
    });
  }
  #scrollDistance = (i(this, "scrollDistance"), void 0);
  static {
    g(this.prototype, "shouldFocusEditor", [tracked], function () {
      return false;
    });
  }
  #shouldFocusEditor = (i(this, "shouldFocusEditor"), void 0);
  constructor(projectRoot) {
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

const EmberLogo = setComponentTemplate(precompileTemplate("\n  <svg width=\"24\" height=\"24\" viewBox=\"0 0 128 128\" xmlns=\"http://www.w3.org/2000/svg\" ...attributes>\n    <g fill=\"none\" fill-rule=\"evenodd\">\n      <path d=\"M64 0c35.346 0 64 28.654 64 64 0 35.346-28.654 64-64 64-35.346 0-64-28.654-64-64C0 28.654 28.654 0 64 0z\" fill=\"#E05C43\" fill-rule=\"nonzero\" />\n      <path d=\"M65.265 24.128c8.246-.163 14.073 2.073 19.087 9.19 10.934 27.109-28.147 41.1-29.714 41.65l-.049.016s-1.18 7.363 10.028 7.08c13.793 0 28.294-10.691 33.81-15.21a3.293 3.293 0 0 1 4.468.265l4.13 4.29a3.291 3.291 0 0 1 .085 4.491c-3.59 3.997-12.014 12.203-24.696 17.504 0 0-21.16 9.798-35.42.52-8.503-5.53-10.842-12.151-11.793-19.038.005 0-10.324-.524-16.957-3.114-6.635-2.592.049-10.411.049-10.411s2.04-3.233 5.92 0c3.883 3.228 11.13 1.772 11.13 1.772.646-5.099 1.72-11.828 4.884-18.93 6.632-14.885 16.789-19.915 25.038-20.075zm4.853 14.915c-4.369-4.21-16.984 4.202-17.471 23.45 0 0 3.724 1.134 11.97-4.53 8.25-5.661 9.87-14.718 5.501-18.92z\" fill=\"#FFFFFF\" />\n    </g>\n  </svg>\n", {
  strictMode: true
}), templateOnly());
const InspectIcon = setComponentTemplate(precompileTemplate("\n  <svg width=\"17\" height=\"16\" viewBox=\"0 0 17 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <path d=\"M12.9013 5.30147L12.9072 2.18288C12.9072 2.01065 12.7728 1.87104 12.6071 1.87104H2.10607C1.94037 1.87104 1.80604 2.01066 1.80604 2.18288L1.80018 11.8499L1.80604 11.9127C1.83403 12.0547 1.95523 12.1618 2.10021 12.1618H5.10638C5.60349 12.1618 6.00647 12.5806 6.00647 13.0973C6.00637 13.6139 5.60342 14.0328 5.10638 14.0328H2.10021C0.976527 14.0328 0.0591503 13.1154 0.00292999 11.962L0 11.8499L0.00585997 2.18288C0.00585997 0.977309 0.946158 0 2.10607 0H12.6071C13.7671 0 14.7074 0.97731 14.7074 2.18288L14.7015 5.30147C14.7014 5.81806 14.2985 6.23699 13.8014 6.23699C13.3044 6.23696 12.9014 5.81803 12.9013 5.30147Z\" fill=\"#000\" />\n    <path d=\"M13.9146 12.5063L13.3849 13.0569C13.1551 13.2957 12.7826 13.2957 12.5529 13.0569L10.8218 11.2577C10.7679 11.2017 10.6758 11.2282 10.6573 11.305L10.2563 12.9722C10.1157 13.5567 9.33229 13.5998 9.1331 13.034L6.82265 6.47015C6.65064 5.98148 7.10712 5.50704 7.57728 5.68582L13.8925 8.08721C14.437 8.29424 14.3955 9.10852 13.8331 9.25466L12.2291 9.67145C12.1551 9.69066 12.1296 9.78637 12.1835 9.84238L13.9146 11.6416C14.1443 11.8804 14.1443 12.2675 13.9146 12.5063Z\" fill=\"#000\" />\n  </svg>\n", {
  strictMode: true
}), templateOnly());

function styleInject(css, ref) {
  if (ref === void 0) ref = {};
  var insertAt = ref.insertAt;
  if (typeof document === 'undefined') {
    return;
  }
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var panel = "sourceLens_panel_Y9iNq";
var sourceLens = "sourceLens_source-lens_KdEdq";
var locationString = "sourceLens_location-string_IzjAP";
var sourceCode = "sourceLens_source-code_TNM08";
var sourceLensOverlay = "sourceLens_source-lens-overlay_Bqj6l";
var panelTitle = "sourceLens_panel-title_ubU0a";
var panelAction = "sourceLens_panel-action_S4usA";
var active = "sourceLens_active_0mbLT";
var panelGroup = "sourceLens_panel-group_cByVR";
var css_248z = "html[class*=\"_esl_active_\"]:has(.sourceLens_panel_Y9iNq) {\n  --_esl-existing-padding: var(--esl-existing-padding, 0);\n  padding-bottom: calc(\n    var(--_esl-existing-padding) + 40px\n  ); /* Make space for the source lens panel */\n}\n\n.sourceLens_source-lens_KdEdq {\n  box-sizing: border-box;\n  font-size: 14px;\n  font-family:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    \"Segoe UI\",\n    Roboto,\n    Oxygen,\n    Ubuntu,\n    Cantarell,\n    \"Open Sans\",\n    \"Helvetica Neue\",\n    sans-serif;\n\n  *,\n  *::before,\n  *::after {\n    box-sizing: border-box;\n  }\n\n  svg {\n    max-width: none;\n  }\n}\n\n.sourceLens_panel_Y9iNq {\n  position: fixed;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  align-items: center;\n  z-index: 10000;\n  background: #f5f5f5;\n  border-top: 1px solid #ccc;\n  height: 40px;\n  white-space: nowrap;\n}\n\n.sourceLens_location-string_IzjAP {\n  display: flex;\n  font: inherit;\n  border-right: 1px solid #ccc;\n  flex-grow: 1;\n  user-select: none;\n  height: 100%;\n  width: 100%;\n  align-items: center;\n  padding: 4px 16px;\n  margin-right: auto;\n  overflow: hidden;\n  color: #333;\n\n  a {\n    color: inherit;\n    text-decoration: none;\n\n    &:hover {\n      text-decoration: underline;\n    }\n  }\n\n  span {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n}\n\n.sourceLens_source-code_TNM08 {\n  position: fixed;\n  bottom: 48px;\n  top: 40%;\n  max-width: 900px;\n  width: calc(100% - 16px);\n  right: 8px;\n  overflow: auto;\n  background: #181818;\n  border: 1px solid #1c1c1c;\n  padding: 0;\n  overflow: hidden;\n  margin-top: 8px;\n  box-sizing: border-box;\n  border-radius: 4px;\n  font: inherit;\n}\n\n.sourceLens_source-lens-overlay_Bqj6l {\n  position: fixed;\n  pointer-events: none;\n  background-color: rgba(0, 255, 229, 0.2);\n  border: 1px solid rgba(0, 255, 229, 0.8);\n  z-index: 9999;\n  box-sizing: border-box;\n  will-change: top, left, width, height;\n  border-radius: 2px;\n}\n\n.sourceLens_panel-title_ubU0a {\n  display: flex;\n  align-items: center;\n  padding: 0 12px;\n  gap: 8px;\n  font: inherit;\n  font-weight: bold;\n  font-size: 12px;\n  height: 100%;\n  border-right: 1px solid #ccc;\n  color: #000;\n  text-decoration: none;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n}\n\n.sourceLens_panel-action_S4usA {\n  background: none;\n  border: none;\n  font: inherit;\n  cursor: pointer;\n  padding: 4px 8px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  border-right: 1px solid #ccc;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n\n  &:active,\n  &.sourceLens_active_0mbLT {\n    background-color: #34343a;\n    color: #6ce6f9;\n\n    path {\n      fill: #6ce6f9;\n    }\n  }\n}\n\n.sourceLens_panel-group_cByVR {\n  display: flex;\n  align-items: center;\n  height: 100%;\n}\n";
styleInject(css_248z);

class SourceLens extends Component {
  sourceLensState = createStore(this, () => new SourceLensState(this.args.projectRoot));
  fileSystemBridge = createStore(this, () => new FileSystemBridge(this.sourceLensState));
  get hasHoveredFile() {
    return Boolean(this.sourceLensState.filePath && this.sourceLensState.lineNumber && this.sourceLensState.columnNumber);
  }
  get hasSelectedFile() {
    return Boolean(this.sourceLensState.selectedFile && this.sourceLensState.selectedLineNumber && this.sourceLensState.selectedColumn);
  }
  fullFilePath(path, line, column) {
    return `${path}:${line}:${column}`;
  }
  get locationString() {
    if (this.hasHoveredFile) {
      return this.fullFilePath(this.sourceLensState.filePath, this.sourceLensState.lineNumber, this.sourceLensState.columnNumber);
    }
    if (this.hasSelectedFile) {
      return this.fullFilePath(this.sourceLensState.selectedFile, this.sourceLensState.selectedLineNumber, this.sourceLensState.selectedColumn);
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
  saveAction = newContent => {
    this.sourceLensState.currentFileContent = newContent;
    this.fileSystemBridge.saveFile(newContent);
  };
  get editorUrl() {
    return getEditorUrl(this.args.editor || 'vscode', this.sourceLensState.absolutePath, this.sourceLensState.selectedLineNumber, this.sourceLensState.selectedColumn, this.sourceLensState.projectRoot);
  }
  openIDE = () => {
    window.location.href = this.editorUrl;
  };
  static {
    setComponentTemplate(precompileTemplate("\n    <div class={{sourceLens}} ...attributes {{sourceLensModifier sourceLensState=this.sourceLensState fileSystemBridge=this.fileSystemBridge sourceLensClass=sourceLens}}>\n      {{#if this.sourceLensState.isEnabled}}\n        <div class={{panel}}>\n          <div class={{panelGroup}}>\n            <a href=\"https://github.com/ember-tooling/ember-source-lens\" target=\"_blank\" rel=\"noopener noreferrer\" class={{panelTitle}}>\n              <EmberLogo />\n              Source Lens\n            </a>\n            <button type=\"button\" class={{concat panelAction \" \" (if this.sourceLensState.overlayEnabled active)}} {{on \"click\" this.sourceLensState.toggleOverlay}}>\n              <InspectIcon />\n            </button>\n          </div>\n          <div class={{locationString}}>\n            <span>\n              {{#if this.locationString}}\n                <a href={{this.editorUrl}}>{{this.locationString}}</a>\n              {{else}}\n                No component selected\n              {{/if}}\n            </span>\n          </div>\n          <div class={{panelGroup}}>\n            {{#if this.sourceLensState.selectedFile}}\n\n              <button type=\"button\" class={{panelAction}} {{on \"click\" this.openIDE}}>\n                Open in IDE\n              </button>\n\n              {{#if this.fileSystemBridge.isConnected}}\n                <button type=\"button\" class={{concat panelAction \" \" (if this.sourceLensState.editorEnabled active)}} {{on \"click\" this.sourceLensState.toggleEditor}}>\n                  Inline Editor\n                </button>\n              {{/if}}\n\n            {{/if}}\n\n          </div>\n\n        </div>\n\n        {{#if this.fileSystemBridge.isConnected}}\n          {{#if this.sourceLensState.editorEnabled}}\n            <Editor class={{sourceCode}} @sourceLensState={{this.sourceLensState}} @saveAction={{this.saveAction}} />\n          {{/if}}\n        {{/if}}\n\n        {{#if this.sourceLensState.overlayEnabled}}\n          <div class={{sourceLensOverlay}} style={{htmlSafe this.overlayRectStyleString}}></div>\n        {{/if}}\n      {{/if}}\n    </div>\n  ", {
      strictMode: true,
      scope: () => ({
        sourceLens,
        sourceLensModifier,
        panel,
        panelGroup,
        panelTitle,
        EmberLogo,
        concat,
        panelAction,
        active,
        on,
        InspectIcon,
        locationString,
        Editor,
        sourceCode,
        sourceLensOverlay,
        htmlSafe
      })
    }), this);
  }
}

export { SourceLens };
//# sourceMappingURL=SourceLens.js.map
