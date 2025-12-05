import process from 'node:process';
import { isRelevantFile } from './utils.js';
import { templatePlugin } from './rewriteHbs.js';

const noopPlugin = {
  name: 'ember-source-lens:noop',
  visitor: {}
};
function createPlugin(config = {}) {
  return function sourceLens(env) {
    const cwd = process.cwd();
    const isRelevant = isRelevantFile(env.filename, {
      additionalRoots: config.additionalRoots,
      cwd
    });
    if (!isRelevant) {
      return noopPlugin;
    }
    const visitors = templatePlugin(env);
    return {
      name: 'ember-source-lens:template-plugin',
      visitor: {
        ...visitors
      }
    };
  };
}

export { createPlugin };
//# sourceMappingURL=template-plugin.js.map
