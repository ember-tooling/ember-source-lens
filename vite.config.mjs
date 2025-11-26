import { defineConfig } from 'vite';
import { extensions, ember, classicEmberSupport } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import { patchCssModules } from 'vite-css-modules';

// For scenario testing
const isCompat = Boolean(process.env.ENABLE_COMPAT_BUILD);

export default defineConfig({
  plugins: [
    patchCssModules({
      generateSourceTypes: true,
    }),
    ...(isCompat ? [classicEmberSupport()] : []),
    ember(),
    babel({
      babelHelpers: 'inline',
      extensions,
    }),
  ],
  css: {
    modules: {
      scopeBehaviour: 'local',
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    rollupOptions: {
      input: {
        tests: 'tests/index.html',
      },
    },
  },
});
