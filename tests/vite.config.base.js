import path from 'path';

export const config = {
  root: `tests`,
  base: './',
  assetsInclude: ['**/*.php'],
  build: {
    manifest: true,
    assetsInlineLimit: 0,
    outDir: 'build',
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
  phpFiles: [
    path.resolve(__dirname, 'external', 'my-external-class.php'),
    path.resolve(__dirname, 'external', 'my-external-functions.php'),
  ],
  assetOptions: {
    svg: {
      path: 'src/assets',
      extensions: ['svg'],
      caller: 'getSvg',
      arg: 0,
    },
    images: {
      path: 'src/assets',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
      caller: 'getImage',
      arg: 0,
    },
    fonts: {
      path: 'src/assets',
      extensions: ['woff', 'woff2'],
      caller: 'getFont',
      arg: 0,
    },
  },
  debug: true,
};
