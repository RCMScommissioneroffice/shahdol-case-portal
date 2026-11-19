import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initSchema, seedDemoData } from './server/db';
import { adminRoutes } from './server/routes/adminRoutes';
import { courtRoutes } from './server/routes/courtRoutes';
import { patwariRoutes } from './server/routes/patwariRoutes';
import { publicRoutes } from './server/routes/publicRoutes';
import { sharedRoutes } from './server/routes/sharedRoutes';

async function startServer() {
  initSchema();
  seedDemoData();

  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', publicRoutes);
  app.use('/api/court', courtRoutes);
  app.use('/api/patwari', patwariRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', sharedRoutes);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(400).json({ error: err.message || 'An unexpected server error occurred.' });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shahdol Division Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
