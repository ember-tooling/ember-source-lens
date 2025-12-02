import { defineConfig } from 'vite';
import { extensions, ember, classicEmberSupport } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import { patchCssModules } from 'vite-css-modules';
import fs from 'node:fs';

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
    {
      // ...
      configureServer(server) {
        server.ws.on('source-lens:open-file', (data, client) => {
          console.log('Message from client:', data.absolutePath);
          // reply only to the client (if needed)

          const fileContent = fs.readFileSync(data.absolutePath, 'utf-8');

          client.send('source-lens:file-response', {
            file: fileContent,
          });
        });

        server.ws.on('source-lens:save-file', (data) => {
          console.log('Save request for file:', data.absolutePath);
          fs.writeFileSync(data.absolutePath, data.content, 'utf-8');
        });
      },
    },
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
