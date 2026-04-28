import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
import classRoutes from './routes/classes';
import dictionaryRoutes from './routes/dictionary';
import { migrateHarmonyAuthorLabels } from './utils/harmonyMigrations';
import sessionRoutes from './routes/sessions';
import submissionRoutes from './routes/submissions';
import messageRoutes from './routes/messages';
import pearlFeedbackRoutes from './routes/pearl-feedback';
import studentRoutes from './routes/student';
import narrativeChoicesRoutes from './routes/narrative-choices';
import clarityCheckRoutes from './routes/clarity-check';
import complianceCheckRoutes from './routes/compliance-check';

const app = express();
const PORT = process.env.PORT || 4000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.isAbsolute(UPLOAD_DIR)
  ? UPLOAD_DIR
  : path.resolve(__dirname, '../', UPLOAD_DIR);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Ensure upload directories exist at startup (not just on first upload)
const briefingPath = path.join(uploadPath, 'briefings');
const welcomePath = path.join(uploadPath, 'welcome');
for (const dir of [uploadPath, briefingPath, welcomePath]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Lexical Republic] Created upload dir: ${dir}`);
  }
}
console.log(`[Lexical Republic] __dirname: ${__dirname}`);
console.log(`[Lexical Republic] UPLOAD_DIR env: ${process.env.UPLOAD_DIR || '(not set, using "uploads")'}`);
console.log(`[Lexical Republic] Resolved upload path: ${uploadPath}`);
console.log(`[Lexical Republic] Upload dir exists: ${fs.existsSync(uploadPath)}`);
console.log(`[Lexical Republic] Briefings dir exists: ${fs.existsSync(briefingPath)}`);

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
  const briefingFiles = fs.existsSync(briefingPath)
    ? fs.readdirSync(briefingPath).slice(0, 10)
    : [];
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uploads: {
      __dirname,
      uploadPath,
      briefingPath,
      uploadDirExists: fs.existsSync(uploadPath),
      briefingDirExists: fs.existsSync(briefingPath),
      briefingFileCount: briefingFiles.length,
      briefingFiles,
    },
  });
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
app.use('/api/classes', classRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/pearl-feedback', pearlFeedbackRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/narrative-choices', narrativeChoicesRoutes);
app.use('/api/clarity-check', clarityCheckRoutes);
app.use('/api/compliance-check', complianceCheckRoutes);

httpServer.listen(PORT, async () => {
  console.log(`[Lexical Republic] Server running on port ${PORT}`);

  // Run data migrations (idempotent — safe on every boot)
  migrateHarmonyAuthorLabels().catch(err =>
    console.error('[Lexical Republic] Harmony label migration failed:', err),
  );
  console.log(`[Lexical Republic] Upload dir: ${uploadPath} (UPLOAD_DIR=${UPLOAD_DIR})`);
  console.log(`[Lexical Republic] Upload dir exists: ${require('fs').existsSync(uploadPath)}`);
  const briefingDir = require('path').join(uploadPath, 'briefings');
  console.log(`[Lexical Republic] Briefing dir exists: ${require('fs').existsSync(briefingDir)}`);
  if (require('fs').existsSync(briefingDir)) {
    try {
      const files = require('fs').readdirSync(briefingDir);
      console.log(`[Lexical Republic] Briefing files: ${files.length} files`);
    } catch { /* ignore */ }
  }
});

export default app;
