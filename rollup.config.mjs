import { babel } from '@rollup/plugin-babel';
import { Addon } from '@embroider/addon-dev/rollup';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import postcss from 'rollup-plugin-postcss';
import typescript from '@rollup/plugin-typescript';
import { minify } from 'rollup-plugin-esbuild-minify';
import copy from 'rollup-plugin-copy';

const addon = new Addon({
  srcDir: 'src',
  destDir: 'dist',
});

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const babelConfig = resolve(rootDirectory, './babel.publish.config.cjs');
const tsConfig = resolve(rootDirectory, './tsconfig.publish.json');

export default [
  {
    // This provides defaults that work well alongside `publicEntrypoints` below.
    // You can augment this if you need to.
    output: addon.output(),

    external: ['node:fs', 'node:path', 'node:assert', 'node:process'],

    plugins: [
      postcss({
        modules: {
          scopeBehaviour: 'local',
          localsConvention: 'camelCase',
          generateScopedName: 'sourceLens_[local]_[hash:base64:5]',
        },
        writeDefinitions: false,
        autoModules: false,
        namedExports: true,
        inject: true,
      }),
      // These are the modules that users should be able to import from your
      // addon. Anything not listed here may get optimized away.
      // By default all your JavaScript modules (**/*.js) will be importable.
      // But you are encouraged to tweak this to only cover the modules that make
      // up your addon's public API. Also make sure your package.json#exports
      // is aligned to the config here.
      // See https://github.com/embroider-build/embroider/blob/main/docs/v2-faq.md#how-can-i-define-the-public-exports-of-my-addon
      addon.publicEntrypoints(['**/*.js', 'index.js']),

      // Follow the V2 Addon rules about dependencies. Your code can import from
      // `dependencies` and `peerDependencies` as well as standard Ember-provided
      // package names.
      addon.dependencies(),

      // This babel config should *not* apply presets or compile away ES modules.
      // It exists only to provide development niceties for you, like automatic
      // template colocation.
      //
      // By default, this will load the actual babel config from the file
      // babel.config.json.
      babel({
        extensions: ['.js', '.gjs', '.ts', '.gts'],
        babelHelpers: 'bundled',
        configFile: babelConfig,
      }),

      // Ensure that .gjs files are properly integrated as Javascript
      addon.gjs(),

      // Emit .d.ts declaration files
      addon.declarations(
        'declarations',
        `pnpm ember-tsc --declaration --project ${tsConfig}`,
      ),

      // Remove leftover build artifacts when starting a new build.
      addon.clean(),
    ],
  },
  {
    input: 'src/babel/plugin.ts',
    output: {
      file: 'dist/babel/plugin.cjs',
      format: 'cjs',
    },
    external: [
      'content-tag',
      'ember-template-recast',
      'node:fs',
      'node:path',
      'node:assert',
      'node:process',
    ],
    plugins: [
      typescript(),
      minify(),
      copy({
        targets: [
          {
            src: 'declarations/babel/plugin.d.ts',
            dest: 'declarations/babel/',
            rename: 'plugin.d.cts',
          },
        ],
      }),
    ],
  },
];
