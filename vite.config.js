import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
// `npm run build` makes one self-contained dist/index.html you can share or host anywhere.
export default defineConfig({ plugins: [viteSingleFile()], build: { assetsInlineLimit: 100000000 } });
