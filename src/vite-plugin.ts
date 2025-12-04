import path from 'node:path';
import fs from 'node:fs';

import { type ViteDevServer, type Plugin } from 'vite';
import type { ViteHotContext } from 'vite/types/hot.js';

function sanitizeFilePath(filePath: string): string {
  // do not allow paths that go outside the project directory
  if (filePath.includes('..')) {
    throw new FileOperationError(
      'You cannot access files outside the project directory',
    );
  }

  // do not allow paths that are absolute unless it matches the project root process.cwd();
  if (filePath.startsWith('/')) {
    const projectRoot = process.cwd();
    if (!filePath.startsWith(projectRoot)) {
      throw new FileOperationError(
        'You can only access files within the project directory',
      );
    }
  }

  if (filePath.includes('node_modules')) {
    throw new FileOperationError(`Can't access files in node_modules`);
  }

  // construct a safe file path from the given input
  // we consider safe paths to be those that are within the project directory
  const projectRoot = process.cwd();
  const safePath = path.resolve(projectRoot, filePath);

  return safePath;
}

type FileMessageData = {
  absolutePath: string;
  content?: string;
};

type FileSaveMessageData = {
  content: string;
};

class FileOperationError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'FileOperationError';
  }
}

class FileOpenError extends FileOperationError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'FileOpenError';
  }
}

class FileSaveError extends FileOperationError {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'FileSaveError';
  }
}

function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: 'An unknown error occurred',
  };
}

// We determine the current selected file
// so that save operations know which file to write to
// and also to prevent arbitrary file writes
let currentSelectedFilePath: string | null = null;

function openFile(data: FileMessageData, client: ViteHotContext) {
  try {
    currentSelectedFilePath = sanitizeFilePath(data.absolutePath);
    const fileContent = fs.readFileSync(currentSelectedFilePath, 'utf-8');

    client.send('source-lens:file-response', {
      file: fileContent,
    });
  } catch (error) {
    if (error instanceof FileOperationError) {
      throw new FileOpenError(`Error opening file: ${data.absolutePath}`, {
        cause: error,
      });
    }

    throw new Error(
      `Unexpected error opening file: ${(error as Error).message}`,
      { cause: error },
    );
  }
}

function saveFile(data: FileSaveMessageData) {
  try {
    if (!currentSelectedFilePath) {
      console.error('No file is currently selected for saving.');
      return;
    }

    fs.writeFileSync(currentSelectedFilePath, data.content, 'utf-8');
  } catch (error) {
    if (error instanceof FileOperationError) {
      throw new FileSaveError(`Error saving file: ${currentSelectedFilePath}`, {
        cause: error,
      });
    }

    throw new Error(
      `Unexpected error saving file: ${(error as Error).message}`,
      { cause: error },
    );
  }
}

export function sourceLens(): Plugin {
  return {
    name: 'ember-source-lens-file-handler',
    configureServer(server: ViteDevServer) {
      server.ws.on('source-lens:check-connection', () => {
        console.log('[ember-source-lens] File system connected');
        server.ws.send('source-lens:connected');
      });

      server.ws.on(
        'source-lens:open-file',
        (data: FileMessageData, client: ViteHotContext) => {
          try {
            openFile(data, client);
          } catch (error) {
            const formattedError = formatError(error);
            client.send('source-lens:error', {
              error: formattedError,
            });
          }
        },
      );

      server.ws.on(
        'source-lens:save-file',
        (data: FileSaveMessageData, client: ViteHotContext) => {
          try {
            saveFile(data);
          } catch (error) {
            const formattedError = formatError(error);
            client.send('source-lens:error', {
              error: formattedError,
            });
          }
        },
      );
    },
  };
}
