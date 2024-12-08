# Vite PHP Asset Callers for Vite 6+

`VitePhpAssetCallers` is a Vite plugin designed to identify and emit assets referenced in PHP functions/callers during the build process. It utilizes PHP parsing to find assets (such as image files, SVGs or Fonts, or other resources) embedded within PHP code, processes them, and then emits them as assets for use in the final bundle.

## Features

- The plugin scans PHP code for asset references, such as images or external files, and identifies them for bundling.
- Allows customization of file extensions, asset paths, and parser options.
- Prevents emitting duplicate assets by keeping track of previously emitted files.
- It supports partial matching of file paths, ensuring assets are correctly identified within PHP .

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
import { defineConfig } from 'vite';
import VitePhpAssetCallers from 'vite-php-asset-callers';

export default defineConfig({
  plugins: [VitePhpAssetCallers()],
});
```

or with plugin options (optional)

```javascript
import { defineConfig } from 'vite';
import VitePhpAssetCallers from 'vite-php-asset-callers';

export default defineConfig({
  plugins: [
    VitePhpAssetCallers({
      assetPath: 'src/images',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'woff', 'woff2', 'svg'],
      phpFiles: ['my-absolute-path/my-class.php', 'my-absolute-path/other-classes/**/*.php'],
    }),
  ],
});
```

## Options

| Option          | Type       | Description                                                                                                            |
| --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| `assetPath`     | `string`   | Relative path from the root where assets are located to match in PHP files, by default it will use Vite's root path.   |
| `phpFiles`      | `string[]` | An array of PHP files or glob patterns to scan in addition to PHP entries.                                             |
| `extensions`    | `string[]` | Asset extensions to search for in PHP code (default: `['png', 'jpg', 'jpeg', 'gif', 'webp', 'woff', 'woff2', 'svg']`). |
| `parserOptions` | `Object`   | Options passed directly to the [php-parser](https://github.com/glayzzle/php-parser).                                   |

## Example

## How It Works

1. The plugin scans the specified PHP files.
2. It resolves paths to asset files based on the arguments in PHP function calls.
3. Matches assets based in Vite's root or on the provided `assetPath` and `extensions`.
4. Emits the matched assets into the Vite output directory for compilation.

## Example

Given the following folder structure for source files.

```plaintext
src/
└── assets/
    ├── svg/
    │   └── coffee.svg
    ├── images/
    │   └── logo.png
    └── fonts/
        └── arial.woff
```

Given the following PHP code with different type of callers:

```php
<?php
echo getImage('logo.png');
echo Utils::getSvg('coffee.svg');
echo $fonts->getFont($someValue, 'arial.woff')
```

The plugin will:

1. Locate all asset files in the root (`src`) folder based on given `extensions`.
2. Match an asset with string arguments inside the PHP caller.
3. Emit the asset files for compilation.
