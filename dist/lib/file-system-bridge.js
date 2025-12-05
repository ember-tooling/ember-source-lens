import { tracked } from '@glimmer/tracking';
import { g, i } from 'decorator-transforms/runtime-esm';

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

export { FileSystemBridge };
//# sourceMappingURL=file-system-bridge.js.map
