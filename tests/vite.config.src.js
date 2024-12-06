import { defineConfig } from 'vite';
import { VitePhpAssetCallers } from '../src';
import { config, pluginOptions } from './vite.config.base';

config.plugins.push(VitePhpAssetCallers(pluginOptions));

export default defineConfig(config);
