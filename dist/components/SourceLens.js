import { concat } from '@ember/helper';
import { on } from '@ember/modifier';
import { htmlSafe } from '@ember/template';
import Component from '@glimmer/component';
import { createStore } from 'ember-primitives/store';
import { getEditorUrl } from '../lib/editor-url.js';
import { FileSystemBridge } from '../lib/file-system-bridge.js';
import { sourceLensModifier } from '../lib/modifier.js';
import { SourceLensState } from '../lib/shared-state.js';
import { Editor } from './editor.js';
import { InspectIcon, EmberLogo } from './icons.js';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

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
var css_248z = "html:has(.sourceLens_panel_Y9iNq) {\n  padding-bottom: 40px; /* Make space for the source lens panel */\n}\n\n.sourceLens_source-lens_KdEdq {\n  box-sizing: border-box;\n  font-size: 14px;\n  font-family:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    \"Segoe UI\",\n    Roboto,\n    Oxygen,\n    Ubuntu,\n    Cantarell,\n    \"Open Sans\",\n    \"Helvetica Neue\",\n    sans-serif;\n\n  *,\n  *::before,\n  *::after {\n    box-sizing: border-box;\n  }\n\n  svg {\n    max-width: none;\n  }\n}\n\n.sourceLens_panel_Y9iNq {\n  position: fixed;\n  width: 100%;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  display: flex;\n  align-items: center;\n  z-index: 10000;\n  background: #f5f5f5;\n  border-top: 1px solid #ccc;\n  height: 40px;\n  white-space: nowrap;\n}\n\n.sourceLens_location-string_IzjAP {\n  display: flex;\n  font: inherit;\n  border-right: 1px solid #ccc;\n  flex-grow: 1;\n  user-select: none;\n  height: 100%;\n  width: 100%;\n  align-items: center;\n  padding: 4px 16px;\n  margin-right: auto;\n  overflow: hidden;\n  color: #333;\n\n  a {\n    color: inherit;\n    text-decoration: none;\n\n    &:hover {\n      text-decoration: underline;\n    }\n  }\n\n  span {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n  }\n}\n\n.sourceLens_source-code_TNM08 {\n  position: fixed;\n  bottom: 48px;\n  top: 40%;\n  max-width: 900px;\n  width: calc(100% - 16px);\n  right: 8px;\n  overflow: auto;\n  background: #181818;\n  border: 1px solid #1c1c1c;\n  padding: 0;\n  overflow: hidden;\n  margin-top: 8px;\n  box-sizing: border-box;\n  border-radius: 4px;\n  font: inherit;\n}\n\n.sourceLens_source-lens-overlay_Bqj6l {\n  position: fixed;\n  pointer-events: none;\n  background-color: rgba(0, 255, 229, 0.2);\n  border: 1px solid rgba(0, 255, 229, 0.8);\n  z-index: 9999;\n  box-sizing: border-box;\n  will-change: top, left, width, height;\n  border-radius: 2px;\n}\n\n.sourceLens_panel-title_ubU0a {\n  display: flex;\n  align-items: center;\n  padding: 0 12px;\n  gap: 8px;\n  font: inherit;\n  font-weight: bold;\n  font-size: 12px;\n  height: 100%;\n  border-right: 1px solid #ccc;\n  color: #000;\n  text-decoration: none;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n}\n\n.sourceLens_panel-action_S4usA {\n  background: none;\n  border: none;\n  font: inherit;\n  cursor: pointer;\n  padding: 4px 8px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100%;\n  border-right: 1px solid #ccc;\n\n  &:hover {\n    background-color: #e0e0e0;\n  }\n\n  &:active,\n  &.sourceLens_active_0mbLT {\n    background-color: #34343a;\n    color: #6ce6f9;\n\n    path {\n      fill: #6ce6f9;\n    }\n  }\n}\n\n.sourceLens_panel-group_cByVR {\n  display: flex;\n  align-items: center;\n  height: 100%;\n}\n";
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
