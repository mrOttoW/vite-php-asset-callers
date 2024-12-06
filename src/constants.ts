export const VITE_PLUGIN_NAME = 'vite-php-asset-callers';
export const DEFAULT_OPTIONS = {
  parserOptions: {
    parser: {
      extractDoc: true,
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
};
