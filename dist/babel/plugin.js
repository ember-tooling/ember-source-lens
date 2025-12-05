import '@babel/types';
import { createPlugin } from './template-plugin.js';

function sourceLens() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
  if (!isProduction) {
    return {
      name: 'remove-source-lens-import-noop',
      visitor: {}
    };
  }
  return {
    name: 'remove-source-lens-import',
    visitor: {
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (source === 'ember-source-lens' || source.endsWith('/SourceLens.gts')) {
          path.remove();
        }
      }
    }
  };
}
sourceLens.template = createPlugin;

export { sourceLens };
//# sourceMappingURL=plugin.js.map
