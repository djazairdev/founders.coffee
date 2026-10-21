import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

const LOCAL_STATE_PATH = fileURLToPath(
  new URL('../../.wrangler/state', import.meta.url),
);

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({
      viteEnvironment: { name: 'ssr' },
      persistState: { path: LOCAL_STATE_PATH },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
