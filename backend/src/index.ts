import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { initSocketServer } from './socketServer';
import authRoutes from './routes/auth';
import recordingRoutes from './routes/recordings';
import pearlRoutes from './routes/pearl';
import shiftRoutes from './routes/shifts';
import vocabularyRoutes from './routes/vocabulary';
import teacherRoutes from './routes/teacher';
import harmonyRoutes from './routes/harmony';
import aiRoutes from './routes/ai';

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.resolve(__dirname, '../', UPLOAD_DIR);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = initSocketServer(app, allowedOrigins);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadPath));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/pearl', pearlRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/harmony', harmonyRoutes);
app.use('/api/ai', aiRoutes);

httpServer.listen(PORT, () => {
  console.log(`[Lexical Republic] Server running on port ${PORT}`);
});

export default app;
