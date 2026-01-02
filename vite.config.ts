import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      optimizeDeps: {
        include: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
      },
      build: {
        commonjsOptions: {
          include: [/firebase/, /node_modules/],
        },
      },
      resolve: {
        alias: {
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
      },
    };
});
