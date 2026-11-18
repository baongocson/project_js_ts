import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const proxy = { '/api': process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000' };

export default defineConfig({
  plugins: [react(), {
    name: 'offline-assets',
    generateBundle(_options,bundle) {
      const assets=Object.keys(bundle).filter(name=>name.startsWith('assets/')&&!name.endsWith('.map')).map(name=>`/${name}`).sort();
      const version=createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,16);
      this.emitFile({type:'asset',fileName:'offline-assets.json',source:JSON.stringify(assets)});
      const worker=readFileSync(new URL('./public/offline-worker.js',import.meta.url),'utf8');
      this.emitFile({type:'asset',fileName:'offline-worker.js',source:worker.replace("const CACHE='dashboard3d-shell-v2';",`const CACHE='dashboard3d-shell-${version}';`)});
    },
  }],
  build: {
    // vendor-three (~940 kB) is lazy-loaded and inherently large; app chunks stay well below this.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keep the 3D libraries in their own long-lived chunk so app changes do not re-download them.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'vendor-three';
        },
      },
    },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy },
  preview: { host: '127.0.0.1', strictPort: true, proxy },
});
