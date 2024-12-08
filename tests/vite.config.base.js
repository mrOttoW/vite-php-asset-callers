import path from 'path';

export const config = {
  root: `tests`,
  assetsInclude: ['**/*.php'],
  build: {
    manifest: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        'my-component': path.resolve(__dirname, 'src', 'my-component.js'),
        'my-component-view': path.resolve(__dirname, 'src', 'my-component.php'),
      },
      output: {
        entryFileNames: ({ name }) => `${name}.js`,
        assetFileNames: '[name][extname]',
      },
    },
  },
  plugins: [],
};

export const pluginOptions = {
  phpFiles: [path.resolve(__dirname, 'external/*.php')],
  debug: true,
};
