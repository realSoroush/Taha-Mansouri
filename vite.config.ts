import { defineConfig, type ViteDevServer, type PreviewServer } from 'vite';
import react from '@vitejs/plugin-react';
import { coursePath } from './src/course-paths';

// Match the canonical directory URL used by Vercel, including in local preview.
function courseRedirect(server: ViteDevServer | PreviewServer) {
  server.middlewares.use((req, res, next) => {
    const requestUrl = 'url' in req && typeof req.url === 'string' ? req.url : '/';
    const url = new URL(requestUrl, 'http://localhost');
    if (['/courses', '/courses/', '/courses/index.html'].includes(url.pathname)) {
      res.writeHead(307, { Location: coursePath + url.search });
      res.end();
      return;
    }
    next();
  });
}
export default defineConfig({
  plugins: [react(), { name: 'course-directory-url', configureServer: courseRedirect, configurePreviewServer: courseRedirect }],
  server: { host: '0.0.0.0', port: 4173, allowedHosts: ['terminal.local'] },
  build: { rollupOptions: { input: { home: 'index.html', customerObjections: 'courses/customer-objections/index.html', courseReturn: 'courses/customer-objections/return/index.html' } } },
});
