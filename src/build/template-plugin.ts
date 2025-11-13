import process from 'node:process';
import type { ASTPlugin } from '@glimmer/syntax';
import { fixFilename } from '../lib/path/template-transform-paths.js';
import { isRelevantFile } from '../lib/path/utils.js';
import { templatePlugin } from '../lib/rewriteHbs.js';

const noopPlugin = {
  name: 'ember-source-lens:noop',
  visitor: {},
};

interface ASTPluginBuilder {
  (env: { filename: string }): ASTPlugin;
}

export function createPlugin(
  config: { additionalRoots?: string[] } = {},
): ASTPluginBuilder {
  return function sourceLens(env) {
    const cwd = process.cwd();

    const isRelevant = isRelevantFile(env.filename, {
      additionalRoots: config.additionalRoots,
      cwd,
    });

    if (!isRelevant) {
      return noopPlugin;
    }

    const relativePath = fixFilename(env.filename);

    const visitors = templatePlugin({ filename: relativePath });

    return {
      name: 'ember-source-lens:template-plugin',
      visitor: {
        ...visitors,
      },
    };
  };
}
