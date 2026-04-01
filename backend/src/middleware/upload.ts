import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const MAX_VIDEO_FILE_SIZE = parseInt(process.env.MAX_VIDEO_FILE_SIZE || '157286400', 10); // 150MB

/** Resolve upload directory at call time (not import time) so env vars are available */
function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR || 'uploads';
  return path.isAbsolute(dir) ? dir : path.resolve(__dirname, '../../', dir);
}

function getBriefingDir(): string {
  const dir = process.env.BRIEFING_UPLOAD_DIR || path.join(getUploadDir(), 'briefings');
  return path.isAbsolute(dir) ? dir : path.resolve(__dirname, '../../', dir);
}

function ensureDirExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const resolved = getUploadDir();
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
    const resolved = getBriefingDir();
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
