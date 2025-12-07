import process from 'node:process';
import { isRelevantFile } from './utils.ts';
import { templatePlugin } from './rewriteHbs.ts';

const noopPlugin = {
  name: 'ember-source-lens:noop',
  visitor: {},
};

interface ASTPluginBuilder {
  (env: { filename: string }): {
    name: string;
    visitor: Record<string, unknown>;
  };
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

    const visitors = templatePlugin(env);

    return {
      name: 'ember-source-lens:template-plugin',
      visitor: {
        ...visitors,
      },
    };
  };
}
