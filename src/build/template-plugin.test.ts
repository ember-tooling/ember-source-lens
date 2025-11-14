import * as babel from '@babel/core';
import { stripIndent } from 'common-tags';
import { Preprocessor } from 'content-tag';
import jscodeshift from 'jscodeshift';
import { describe, expect, it } from 'vitest';

import { createPlugin } from './template-plugin.js';

const p = new Preprocessor();

async function transform(file: string, config = {}) {
  const { code: js } = p.process(file);
  const result = await babel.transformAsync(js, {
    plugins: [
      [
        'babel-plugin-ember-template-compilation',
        {
          targetFormat: 'hbs',
          transforms: [createPlugin(config)],
        },
      ],
    ],
    filename: 'src/components/example-component.gjs',
    babelrc: false,
    configFile: false,
  });

  return result?.code;
}

function templateContentsOf(file: string | null | undefined) {
  if (!file) return [];

  const result: string[] = [];

  jscodeshift(file)
    .find(jscodeshift.CallExpression, {
      callee: { name: 'precompileTemplate' },
    })
    .forEach((path) => {
      const first = path.node.arguments[0];

      if (first?.type === 'StringLiteral' || first?.type === 'Literal') {
        if (typeof first.value === 'string') {
          result.push(stripIndent(first.value));
        }
      }
    });

  return result;
}

describe('Adds data attributes to tags', () => {
  it('works on template only components', async () => {
    const output = await transform(`
        export const Foo = <template>
            <div class="foo">
                <h1>Hello, World!</h1>
            </div>
        </template>;
    `);

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
    [
      "<div data-source-file="/src/components/example-component.gjs" class="foo">
        <h1 data-source-file="/src/components/example-component.gjs">Hello, World!</h1>
    </div>",
    ]
  `);
  });

  it('works on class components', async () => {
    const output = await transform(`
        import Component from '@glimmer/component';

        export default class BarComponent extends Component {
          <template>
            <section class="bar">
              <p>Welcome to Ember!</p>
            </section>
          </template>;
        }
    `);

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
    [
      "<section data-source-file="/src/components/example-component.gjs" class="bar">
      <p data-source-file="/src/components/example-component.gjs">Welcome to Ember!</p>
    </section>",
    ]
  `);
  });

  it('works on template only components with multiple templates', async () => {
    const output = await transform(`
        export const Foo = <template>
            <div class="foo">
                <h1>Hello, World!</h1>
            </div>
        </template>;

        export const Bar = <template>
            <section class="bar">
              <p>Welcome to Ember!</p>
            </section>
        </template>;
    `);

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
    [
      "<div data-source-file="/src/components/example-component.gjs" class="foo">
        <h1 data-source-file="/src/components/example-component.gjs">Hello, World!</h1>
    </div>",
      "<section data-source-file="/src/components/example-component.gjs" class="bar">
      <p data-source-file="/src/components/example-component.gjs">Welcome to Ember!</p>
    </section>",
    ]
  `);
  });
});
