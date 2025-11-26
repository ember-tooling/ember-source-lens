import process from 'node:process';
import { isRelevantFile } from '../lib/path/utils.js';
import { templatePlugin } from '../lib/rewriteHbs.js';

const noopPlugin = {
  name: 'ember-source-lens:noop',
  visitor: {},
};

export function createPlugin(config = {}) {
  return function sourceLens(env) {
    const cwd = process.cwd();

    const isRelevant = isRelevantFile(env.filename, {
      additionalRoots: config.additionalRoots,
      cwd,
    });

    if (!isRelevant) {
      return noopPlugin;
    }

    const visitors = templatePlugin(env);

    return {
      name: 'ember-source-lens:template-plugin',
      visitor: {
        ...visitors,
      },
    };
  };
}
