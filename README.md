# Vite PHP Asset Callers for Vite 6+

It scans your PHP files for asset calls (images, fonts, svg) and emits & compiles the necessary assets based on your custom-defined options.

## Features

- Parse and analyze PHP files for asset calls.
- Emit assets based on customizable options.
- Compatible with a variety of PHP constructs, including functions, classes, traits, and expressions.
- Analyzes PHP entries automatically and additional PHP files by configuration.

## Installation

Install it via npm:

```bash
npm install vite-php-asset-callers --save-dev
```

Or with yarn:

```bash
yarn add -D vite-php-asset-callers
```

## Usage

Add the plugin to your `vite.config.js` file:

```javascript
import {defineConfig} from 'vite';
import VitePhpAssetCallers from 'vite-php-asset-callers';

export default defineConfig({
  plugins: [
    VitePhpAssetCallers({
      assetOptions: {
        svg:    {
          path:       'src/assets',
          extensions: ['svg'],
          caller:     'getSvg',
        },
        images: {
          path:       'src/assets',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
          caller:     'getImage',
        },
        fonts:  {
          path:       'src/assets',
          extensions: ['woff', 'woff2'],
          caller:     'getFont',
        },
      },
    }),
  ],
});
```

## Options
| Option          | Type       | Description                                                                                     |
|-----------------|------------|-------------------------------------------------------------------------------------------------|
| `assetOptions`  | `Object`   | Defines the asset types and their associated configurations. See sub-options below.             |
| └ `path`        | `string`   | The directory where the un-compiled assets are located.                                         |
| └ `extensions`  | `string[]` | An array of allowed file extensions for the asset type.                                         |
| └ `caller`      | `string`   | The name of the function or class/instance that references the asset or name.                   |
| └ `method`      | `string`   | (optional) The name of method when using static or instance calls.                              |
| └ `arg`         | `number`   | (optional) The argument index of the asset's file name.                                         |
| `phpFiles`      | `string[]` | (optional) An array of PHP files to scan in addition to PHP entries.                            |
| `parserOptions` | `Object`   | (optional) Options passed directly to the [php-parser](https://github.com/glayzzle/php-parser). |


## Example

## How It Works

1. The plugin scans the specified PHP files.
2. It identifies function or method calls based on the `caller` defined in the `assetOptions`.
3. Matches assets based on the provided `path` and `extensions`.
4. Emits the matched assets into the Vite output directory.

## Example

Given the following PHP code with different type of callers:

```php
<?php
echo getImage('logo.png');
echo Utils::getSvg('coffee.svg');
echo $fonts->getFont($someValue, 'arial.woff')
```

And the configuration:

```javascript
VitePhpAssetCallers({
  assetOptions: {
    images: {
      path:       'src/assets/images',
      extensions: ['jpg', 'png'],
      caller:     'getImage',
    },
    svg:    {
      path:       'src/assets/svg',
      extensions: ['svg'],
      caller:     'Utils',
      method:     'getSvg',
    },
    fonts:    {
      path:       'src/assets/fonts',
      extensions: ['swoff', 'woff2'],
      caller:     'fonts',
      method:     'getfont',
      arg:        1,
    },
  },
});
```

The plugin will:

1. Locate `logo.png` in `src/assets/images` 
2. Locate `coffee.svg` in `src/assets/svg` 
3. Locate `arial.woff` in `src/assets/fonts` 
4. Emit the asset files for compilation.

