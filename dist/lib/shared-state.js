import localStorage from 'ember-local-storage-decorator';
import { tracked } from '@glimmer/tracking';
import { g, i } from 'decorator-transforms/runtime-esm';

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

export { SourceLensState };
//# sourceMappingURL=shared-state.js.map
