import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { getRequestListener } from '@hono/node-server';
import path from 'path';
import { defineConfig } from 'vite';

const API_PREFIXES = ['/api', '/auth', '/health', '/db-health', '/poc', '/devices', '/internal'];

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'hono-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '/';
            const isApiRoute = API_PREFIXES.some(
              (prefix) =>
                url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`)
            );
            if (!isApiRoute) return next();

            try {
              const { app } = await server.ssrLoadModule('/apps/src/index.ts');
              const listener = getRequestListener((request) => app.fetch(request));
              await listener(req, res);
            } catch (err) {
              next(err as Error);
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@quiz/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
        '@packages/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
        '@repo/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
        '@quiz-service': path.resolve(__dirname, 'services/quiz-service/src/index.ts'),
        '@attempt-service': path.resolve(__dirname, 'services/attempt-service/src/index.ts'),
        '@payment-service': path.resolve(__dirname, 'services/payment-service/src/index.ts'),
        '@analytics-service': path.resolve(__dirname, 'services/analytics-service/src/index.ts'),
        '@auth-service': path.resolve(__dirname, 'services/auth-service/src/index.ts'),
        '@shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist/public',
      emptyOutDir: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
