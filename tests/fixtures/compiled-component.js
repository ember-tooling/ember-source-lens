import Component from '@glimmer/component';
import { modifier } from 'ember-modifier';
import { tracked } from '@glimmer/tracking';
import { createStore } from 'ember-primitives/store';
import { htmlSafe } from '@ember/template';
import localStorage from 'ember-local-storage-decorator';
import { on } from '@ember/modifier';
import { Editor } from './editor.js';
import { concat } from '@ember/helper';
import { InspectIcon, EmberLogo } from './icons.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import { g, i } from 'decorator-transforms/runtime-esm';

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

var sourceLens = 'sourceLens_source-lens_KdEdq';
var panel = 'sourceLens_panel_Y9iNq';
var locationString = 'sourceLens_location-string_IzjAP';
var sourceCode = 'sourceLens_source-code_TNM08';
var sourceLensOverlay = 'sourceLens_source-lens-overlay_Bqj6l';
var panelTitle = 'sourceLens_panel-title_ubU0a';
var panelAction = 'sourceLens_panel-action_S4usA';
var active = 'sourceLens_active_0mbLT';
var panelGroup = 'sourceLens_panel-group_cByVR';
var css_248z =
  'html {\n  padding-bottom: 40px; /* Make space for the source lens panel */\n}\n\n.sourceLens_source-lens_KdEdq {\n  box-sizing: border-box;\n\n  *,\n  *::before,\n  *::after {\n    box-sizing: border-box;\n  }\n}\n\n.sourceLens_panel_Y9iNq {\n  position: fixed;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  align-items: center;\n  z-index: 10000;\n  background: #f5f5f5;\n  border-top: 1px solid #ccc;\n  height: 40px;\n  white-space: nowrap;\n  font-family:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Oxygen,\n    Ubuntu,\n    Cantarell,\n    "Open Sans",\n    "Helvetica Neue",\n    sans-serif;\n}\n\n.sourceLens_location-string_IzjAP {\n  display: flex;\n  font-size: 14px;\n  color: #333;\n  border-right: 1px solid #ccc;\n  flex-grow: 1;\n  user-select: none;\n  height: 100%;\n  width: 100%;\n  align-items: center;\n  padding: 4px 16px;\n  margin-right: auto;\n  overflow: hidden;\n\n  span {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n}\n\n.sourceLens_source-code_TNM08 {\n  position: fixed;\n  bottom: 48px;\n  top: 40%;\n  max-width: 900px;\n  width: calc(100% - 16px);\n  right: 8px;\n  overflow: auto;\n  background: #181818;\n  border: 1px solid #1c1c1c;\n  padding: 0;\n  overflow: hidden;\n  margin-top: 8px;\n  box-sizing: border-box;\n  border-radius: 4px;\n}\n\n.sourceLens_source-lens-overlay_Bqj6l {\n  position: fixed;\n  pointer-events: none;\n  background-color: rgba(0, 255, 229, 0.2);\n  border: 1px solid rgba(0, 255, 229, 0.8);\n  z-index: 9999;\n  box-sizing: border-box;\n  will-change: top, left, width, height;\n  border-radius: 2px;\n}\n\n.sourceLens_panel-title_ubU0a {\n  display: flex;\n  align-items: center;\n  padding: 0 12px;\n  gap: 8px;\n  font-weight: bold;\n  font-size: 12px;\n  height: 100%;\n  border-right: 1px solid #ccc;\n  color: #000;\n  text-decoration: none;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n}\n\n.sourceLens_panel-action_S4usA {\n  background: none;\n  border: none;\n  cursor: pointer;\n  padding: 4px 8px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  border-right: 1px solid #ccc;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n\n  &:active,\n  &.sourceLens_active_0mbLT {\n    background-color: #34343a;\n    color: #6ce6f9;\n\n    path {\n      fill: #6ce6f9;\n    }\n  }\n}\n\n.sourceLens_panel-group_cByVR {\n  display: flex;\n  align-items: center;\n  height: 100%;\n}\n';
styleInject(css_248z);

class SourceLensState {
  static {
    g(
      this.prototype,
      'isEnabled',
      [localStorage('source-lens:enabled')],
      function () {
        return false;
      },
    );
  }
  #isEnabled = (i(this, 'isEnabled'), void 0);
  static {
    g(
      this.prototype,
      'filePath',
      [localStorage('source-lens:filePath')],
      function () {
        return null;
      },
    );
  }
  #filePath = (i(this, 'filePath'), void 0);
  static {
    g(
      this.prototype,
      'lineNumber',
      [localStorage('source-lens:lineNumber')],
      function () {
        return null;
      },
    );
  }
  #lineNumber = (i(this, 'lineNumber'), void 0);
  static {
    g(
      this.prototype,
      'columnNumber',
      [localStorage('source-lens:columnNumber')],
      function () {
        return null;
      },
    );
  }
  #columnNumber = (i(this, 'columnNumber'), void 0);
  static {
    g(
      this.prototype,
      'currentFileContent',
      [localStorage('source-lens:currentFileContent')],
      function () {
        return '';
      },
    );
  }
  #currentFileContent = (i(this, 'currentFileContent'), void 0);
  static {
    g(
      this.prototype,
      'selectedFile',
      [localStorage('source-lens:selectedFile')],
      function () {
        return null;
      },
    );
  }
  #selectedFile = (i(this, 'selectedFile'), void 0);
  static {
    g(
      this.prototype,
      'selectedLineNumber',
      [localStorage('source-lens:selectedLineNumber')],
      function () {
        return null;
      },
    );
  }
  #selectedLineNumber = (i(this, 'selectedLineNumber'), void 0);
  static {
    g(
      this.prototype,
      'selectedColumn',
      [localStorage('source-lens:selectedColumn')],
      function () {
        return null;
      },
    );
  }
  #selectedColumn = (i(this, 'selectedColumn'), void 0);
  static {
    g(
      this.prototype,
      'editorEnabled',
      [localStorage('source-lens:editorEnabled')],
      function () {
        return false;
      },
    );
  }
  #editorEnabled = (i(this, 'editorEnabled'), void 0);
  static {
    g(this.prototype, 'overlayEnabled', [tracked], function () {
      return false;
    });
  }
  #overlayEnabled = (i(this, 'overlayEnabled'), void 0);
  static {
    g(this.prototype, 'element', [tracked], function () {
      return null;
    });
  }
  #element = (i(this, 'element'), void 0);
  static {
    g(this.prototype, 'boundingClientRect', [tracked], function () {
      return null;
    });
  }
  #boundingClientRect = (i(this, 'boundingClientRect'), void 0);
  static {
    g(this.prototype, 'scrollDistance', [tracked], function () {
      return 0;
    });
  }
  #scrollDistance = (i(this, 'scrollDistance'), void 0);
  static {
    g(this.prototype, 'shouldFocusEditor', [tracked], function () {
      return false;
    });
  }
  #shouldFocusEditor = (i(this, 'shouldFocusEditor'), void 0);
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
function isElementWithSource(element) {
  return 'sourceFile' in element && 'sourceLine' in element;
}
function clearSourceLensDataAttributes() {
  const elsWithLens = document.querySelectorAll('[data-source-file]');
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
const sourceLensModifier = modifier((_element, _positional, named) => {
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
  const moveHandler = (e) => {
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
  const clickElementHandler = (e) => {
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
        import.meta.hot.send('source-lens:open-file', {
          absolutePath,
        });
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
  const keyHandler = (e) => {
    // Check for Cmd+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux)
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      sourceLensState.toggleEnabled();
      sourceLensState.resetState();
    }
  };
  const absorbClicks = (e) => {
    if (!sourceLensState.isEnabled) return;
    if (!sourceLensState.overlayEnabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
  };
  document.addEventListener('keydown', keyHandler, {
    signal,
  });
  document.addEventListener('scroll', scrollHandler, {
    signal,
  });
  document.addEventListener('mousemove', moveHandler, {
    signal,
  });
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
});
class SourceLens extends Component {
  static {
    g(this.prototype, 'fileSystemConnected', [tracked], function () {
      return false;
    });
  }
  #fileSystemConnected = (i(this, 'fileSystemConnected'), void 0);
  constructor(owner, args) {
    super(owner, args);
    if (import.meta.hot) {
      import.meta.hot.send('source-lens:check-connection');
      import.meta.hot.on('source-lens:connected', () => {
        this.fileSystemConnected = true;
        if (this.sourceLensState.selectedFile) {
          const absolutePath = this.absolutePath;
          import.meta.hot?.send('source-lens:open-file', {
            absolutePath,
          });
        }
      });
      import.meta.hot.on('source-lens:file-response', (data) => {
        this.sourceLensState.currentFileContent = data.file;
      });
    }
  }
  get projectRoot() {
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
  saveAction = (newContent) => {
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
  static {
    setComponentTemplate(
      precompileTemplate(
        '\n    <div class={{sourceLens}} ...attributes {{sourceLensModifier projectRoot=this.projectRoot sourceLensState=this.sourceLensState}}>\n      {{#if this.sourceLensState.isEnabled}}\n        <div class={{panel}}>\n          <div class={{panelGroup}}>\n            <a href="https://github.com/ember-tooling/ember-source-lens" target="_blank" rel="noopener noreferrer" class={{panelTitle}}>\n              <EmberLogo />\n              Source Lens\n            </a>\n            <button type="button" class={{concat panelAction " " (if this.sourceLensState.overlayEnabled active)}} {{on "click" this.sourceLensState.toggleOverlay}}>\n              <InspectIcon />\n            </button>\n          </div>\n          <div class={{locationString}}>\n            <span>\n              {{if this.locationString this.locationString "No component selected"}}\n            </span>\n          </div>\n          <div class={{panelGroup}}>\n            {{#if this.sourceLensState.selectedFile}}\n\n              <button type="button" class={{panelAction}} {{on "click" this.openIDE}}>\n                Open in IDE\n              </button>\n\n              {{#if this.fileSystemConnected}}\n                <button type="button" class={{concat panelAction " " (if this.sourceLensState.editorEnabled active)}} {{on "click" this.sourceLensState.toggleEditor}}>\n                  Inline Editor\n                </button>\n              {{/if}}\n\n              <button type="button" class={{panelAction}} {{on "click" this.sourceLensState.resetState}}>\n                Clear State\n              </button>\n\n            {{/if}}\n\n          </div>\n\n        </div>\n\n        {{#if this.fileSystemConnected}}\n          {{#if this.sourceLensState.editorEnabled}}\n            <Editor class={{sourceCode}} @content={{this.sourceLensState.currentFileContent}} @filepath={{this.sourceLensState.selectedFile}} @lineNumber={{this.sourceLensState.selectedLineNumber}} @columnNumber={{this.sourceLensState.selectedColumn}} @saveAction={{this.saveAction}} @disableAction={{this.sourceLensState.toggleEnabled}} @shouldFocusEditor={{this.sourceLensState.shouldFocusEditor}} />\n          {{/if}}\n        {{/if}}\n\n        {{#if this.sourceLensState.overlayEnabled}}\n          <div class={{sourceLensOverlay}} style={{htmlSafe this.overlayRectStyleString}}></div>\n        {{/if}}\n      {{/if}}\n    </div>\n  ',
        {
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
            htmlSafe,
          }),
        },
      ),
      this,
    );
  }
}

export { SourceLens };
//# sourceMappingURL=SourceLens.js.map
