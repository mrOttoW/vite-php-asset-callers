export const VITE_PLUGIN_NAME = 'vite-php-asset-callers';
export const DEFAULT_OPTIONS = {
  assetPath: '',
  extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'woff', 'woff2', 'svg'],
  parserOptions: {
    parser: {
      extractDoc: false,
      suppressErrors: true,
      version: 704, // or '7.4'
    },
    ast: {
      withPositions: true,
    },
    lexer: {
      short_tags: true,
      asp_tags: true,
    },
  },
  phpFiles: [],
  debug: false,
};
