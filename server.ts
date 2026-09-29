import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/api.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists for legacy local routing compatibility if needed
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // CORS configuration allowing all origins, methods, and custom upload headers
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*']
  }));
  app.options('*', (req, res) => {
    res.sendStatus(204);
  });
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Static uploads
  app.use('/uploads', express.static(uploadsDir));

  // Direct upload alias in case requests hit /upload/* directly
  app.all('/upload/*', (req, res, next) => {
    req.url = `/upload${req.url.replace(/^\/upload/, '')}`;
    apiRouter(req, res, next);
  });

  // API Routes
  app.use('/api', apiRouter);

  // Catch-all for /api/* to always return clean JSON errors instead of falling into Vite SPA 405 Method Not Allowed
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
