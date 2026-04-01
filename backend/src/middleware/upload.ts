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

/** Resolve upload base dir from UPLOAD_DIR env — same logic as dictionary.ts and index.ts */
function resolveUploadBase(): string {
  const raw = process.env.UPLOAD_DIR || 'uploads';
  return path.isAbsolute(raw) ? raw : path.resolve(__dirname, '../../', raw);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = resolveUploadBase();
    ensureDirExists(dir);
    cb(null, dir);
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
    // Always derive from UPLOAD_DIR — ignore BRIEFING_UPLOAD_DIR to avoid path mismatches
    const dir = path.join(resolveUploadBase(), 'briefings');
    console.log(`[upload.ts v3] video destination: ${dir}`);
    ensureDirExists(dir);
    cb(null, dir);
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
