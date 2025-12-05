import * as babel from '@babel/core';
import { stripIndent } from 'common-tags';
import { Preprocessor } from 'content-tag';
import jscodeshift from 'jscodeshift';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { sourceLens } from '#src/babel/plugin.ts';
import { leadingSlashPath } from '#src/babel/const.ts';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const p = new Preprocessor();

async function transform(filename: string, config = {}) {
  const fsPath = path.join(__dirname, filename);
  const file = fs.readFileSync(fsPath, 'utf-8');
  const { code: js } = p.process(file);
  const result = await babel.transformAsync(js, {
    plugins: [
      [
        'babel-plugin-ember-template-compilation',
        {
          targetFormat: 'hbs',
          transforms: [sourceLens.template(config)],
        },
      ],
      sourceLens(),
    ],
    filename: fsPath,
    babelrc: false,
    configFile: false,
  });

  return result?.code;
}

async function transformInline(file: string, filename: string, config = {}) {
  const { code: js } = p.process(file);
  const result = await babel.transformAsync(js, {
    plugins: [
      [
        'babel-plugin-ember-template-compilation',
        {
          targetFormat: 'hbs',
          transforms: [sourceLens.template(config)],
        },
      ],
      sourceLens(),
    ],
    filename: filename || 'src/components/example-component.gjs',
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
    const output = await transform('./fixtures/toc.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<div data-source-file="/tests/fixtures/toc.gjs" data-source-line="2" data-source-column="3" class="foo">
        <h1 data-source-file="/tests/fixtures/toc.gjs" data-source-line="3" data-source-column="5">Hello, World!</h1>
      </div>",
      ]
    `);
  });

  it('works on class components', async () => {
    const output = await transform('./fixtures/class.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<section data-source-file="/tests/fixtures/class.gjs" data-source-line="6" data-source-column="5" class="bar">
        <p data-source-file="/tests/fixtures/class.gjs" data-source-line="7" data-source-column="7">Welcome to Ember!</p>
      </section>",
      ]
    `);
  });

  it('works on template only components with multiple templates', async () => {
    const output = await transform('./fixtures/multiple-templates.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<div data-source-file="/tests/fixtures/multiple-templates.gjs" data-source-line="2" data-source-column="3" class="foo">
        <h1 data-source-file="/tests/fixtures/multiple-templates.gjs" data-source-line="3" data-source-column="5">Hello, World!</h1>
      </div>",
        "<section data-source-file="/tests/fixtures/multiple-templates.gjs" data-source-line="8" data-source-column="3" class="bar">
        <p data-source-file="/tests/fixtures/multiple-templates.gjs" data-source-line="9" data-source-column="5">Welcome to Ember!</p>
      </section>",
      ]
    `);
  });

  it('it does nothing if node_env is production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const output = await transform('./fixtures/toc.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<div class="foo">
        <h1>Hello, World!</h1>
      </div>",
      ]
    `);

    process.env.NODE_ENV = originalNodeEnv;
  });

  it('it does nothing if path is not relevant', async () => {
    const output = await transformInline(
      `
      export const Foo = <template>
        <div class="foo">
          <h1>Hello, World!</h1>
        </div>
      </template>`,
      leadingSlashPath.atEmbroider + '/some-addon/components/foo.gjs',
    );

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<div class="foo">
        <h1>Hello, World!</h1>
      </div>",
      ]
    `);
  });

  it('handles normal js files', async () => {
    const output = await transformInline(
      `export { SourceLens } from './dist/components/source-lens.js';`,
      'src/utils/example.js',
    );

    expect(output).toMatchInlineSnapshot(
      `"export { SourceLens } from './dist/components/source-lens.js';"`,
    );
  });

  it('handles a compiled component', async () => {
    const output = await transform('./fixtures/compiled-component.js', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchSnapshot();
  });

  it('handles yield blocks', async () => {
    const output = await transform('./fixtures/yield-blocks.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<Thing data-source-file="/tests/fixtures/yield-blocks.gjs" data-source-line="2" data-source-column="3">
        <:block1>
        </:block1>
      </Thing>",
      ]
    `);
  });

  it('handles matching templates in same file', async () => {
    const output = await transform(
      './fixtures/multiple-matching-templates.gjs',
      {
        additionalRoots: ['tests/fixtures'],
      },
    );

    expect(templateContentsOf(output)).toMatchInlineSnapshot(`
      [
        "<div data-source-file="/tests/fixtures/multiple-matching-templates.gjs" data-source-line="2" data-source-column="3" class="foo">
        <h1 data-source-file="/tests/fixtures/multiple-matching-templates.gjs" data-source-line="3" data-source-column="5">Hello, World!</h1>
      </div>",
        "<div data-source-file="/tests/fixtures/multiple-matching-templates.gjs" data-source-line="8" data-source-column="3" class="foo">
        <h1 data-source-file="/tests/fixtures/multiple-matching-templates.gjs" data-source-line="9" data-source-column="5">Hello, World!</h1>
      </div>",
      ]
    `);
  });
});

describe('removes SourceLens component and import in production', () => {
  it('works on template only components', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const output = await transform('./fixtures/remove-sourcelens.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(output).toMatchInlineSnapshot(`
        "import { precompileTemplate } from "@ember/template-compilation";
        import { setComponentTemplate } from "@ember/component";
        import templateOnly from "@ember/component/template-only";
        export default setComponentTemplate(precompileTemplate("\\n  <h1>Hello, Source Lens!</h1>\\n  \\n", {
          strictMode: true
        }), templateOnly());"
      `);
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('works on class components', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const output = await transform('./fixtures/remove-sourcelens-class.gjs', {
      additionalRoots: ['tests/fixtures'],
    });

    expect(output).toMatchInlineSnapshot(`
        "import Component from '@glimmer/component';
        import { precompileTemplate } from "@ember/template-compilation";
        import { setComponentTemplate } from "@ember/component";
        export default class MyComponent extends Component {
          get thing() {
            return 'value';
          }
          static {
            setComponentTemplate(precompileTemplate("\\n    <h1>Hello, Source Lens!</h1>\\n    \\n  ", {
              strictMode: true
            }), this);
          }
        }"
      `);
    process.env.NODE_ENV = originalNodeEnv;
  });
});
