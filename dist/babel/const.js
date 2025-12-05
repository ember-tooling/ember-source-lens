import path from 'node:path';

const leadingSlashPath = {
  atEmbroider: path.join('/@embroider'),
  componentsDir: path.join('/components/'),
  templatesDir: path.join('/templates/'),
  routesDir: path.join('/routes/'),
  testem: path.join('/testem'),
  src: path.join('/src/'),
  app: path.join('/app/')
};
const barePath = {
  pnpmDir: path.join('node_modules/.pnpm')
};

export { barePath, leadingSlashPath };
//# sourceMappingURL=const.js.map
