import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const MAX_VIDEO_FILE_SIZE = parseInt(process.env.MAX_VIDEO_FILE_SIZE || '157286400', 10); // 150MB

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const resolved = path.isAbsolute(uploadDir) ? uploadDir : path.resolve(__dirname, '../../', uploadDir);
    ensureDirExists(resolved);
    cb(null, resolved);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const uploadAudio = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Read env at request time, not import time
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const base = path.isAbsolute(uploadDir) ? uploadDir : path.resolve(__dirname, '../../', uploadDir);
    const briefingDir = process.env.BRIEFING_UPLOAD_DIR || path.join(base, 'briefings');
    const resolved = path.isAbsolute(briefingDir) ? briefingDir : path.resolve(__dirname, '../../', briefingDir);
    console.log(`[upload.ts v2] UPLOAD_DIR=${uploadDir}, resolved briefing dir=${resolved}`);
    ensureDirExists(resolved);
    cb(null, resolved);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

// In-memory audio upload for streaming to Whisper (no disk writes)
const memoryStorage = multer.memoryStorage();

export const uploadAudioMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

export const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith('video/')
      || ['.mp4', '.webm', '.mov', '.m4v'].includes(path.extname(file.originalname).toLowerCase());
    if (allowed) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});
