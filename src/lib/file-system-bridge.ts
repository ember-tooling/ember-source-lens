import { tracked } from '@glimmer/tracking';
import type { SourceLensState } from './shared-state';

export class FileSystemBridge {
  @tracked isConnected = false;

  constructor(private sourceLensState: SourceLensState) {
    this.setup();
  }

  private setup() {
    if (!import.meta.hot) return;

    import.meta.hot.send('source-lens:check-connection');

    import.meta.hot.on('source-lens:connected', () => {
      this.isConnected = true;
      if (this.sourceLensState.selectedFile) {
        this.openFile(this.sourceLensState.absolutePath);
      }
    });

    import.meta.hot.on(
      'source-lens:file-response',
      (data: { file: string }) => {
        this.sourceLensState.currentFileContent = data.file;
      },
    );
  }

  openFile(absolutePath: string) {
    if (!import.meta.hot) return;
    import.meta.hot.send('source-lens:open-file', { absolutePath });
  }

  saveFile(content: string) {
    if (!import.meta.hot) return;
    import.meta.hot.send('source-lens:save-file', { content });
  }
}
