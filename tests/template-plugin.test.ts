import * as babel from '@babel/core';
import { stripIndent } from 'common-tags';
import { Preprocessor } from 'content-tag';
import jscodeshift from 'jscodeshift';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { createPlugin } from '../src/babel/template-plugin';

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
          transforms: [createPlugin(config)],
        },
      ],
    ],
    filename: fsPath,
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
});
