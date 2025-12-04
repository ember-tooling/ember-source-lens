import type { PluginObj } from '@babel/core';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as templatePlugin from './template-plugin.ts';

export function sourceLens(): PluginObj {
  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';

  if (!isProduction) {
    return {
      name: 'remove-source-lens-import-noop',
      visitor: {},
    };
  }

  return {
    name: 'remove-source-lens-import',
    visitor: {
      ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
        const source = path.node.source.value;
        if (
          source === 'ember-source-lens' ||
          source.endsWith('/SourceLens.gts')
        ) {
          path.remove();
        }
      },
    },
  };
}

sourceLens.template = templatePlugin.createPlugin;
