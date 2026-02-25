import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, getPairId } from '../middleware/auth';
import { uploadAudio, uploadAudioMemory } from '../middleware/upload';
import OpenAI, { toFile } from 'openai';

const router = Router();

// ---------------------------------------------------------------------------
// Whisper client — lazy init
// ---------------------------------------------------------------------------

let whisperClient: OpenAI | null = null;

function getWhisperClient(): OpenAI | null {
  if (whisperClient) return whisperClient;
  const apiKey = process.env.AZURE_WHISPER_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_WHISPER_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_WHISPER_DEPLOYMENT || 'whisper';

  if (!apiKey || !endpoint) return null;

  whisperClient = new OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments/${deployment}`,
    defaultQuery: { 'api-version': '2024-06-01' },
    defaultHeaders: { 'api-key': apiKey },
  });
  return whisperClient;
}

// POST /api/recordings — upload audio recording
router.post('/', authenticate, uploadAudio.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const pairId = getPairId(req);

    const recording = await prisma.recording.create({
      data: {
        userId: pairId ? undefined : req.user!.userId,
        pairId: pairId ?? undefined,
        missionId: req.body.missionId || null,
        filename: req.file.filename,
        duration: req.body.duration ? parseFloat(req.body.duration) : null,
        status: 'processing',
      },
    });

    res.status(201).json({ recording });
  } catch (err) {
    console.error('Recording upload error:', err);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// POST /api/recordings/:id/transcribe — in-memory Whisper transcription
router.post('/:id/transcribe', authenticate, uploadAudioMemory.single('audio'), async (req: Request, res: Response) => {
  const recordingId = req.params.id as string;

  try {
    // Verify ownership (check both userId and pairId)
    const pairId = getPairId(req);
    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
        OR: [
          { userId: req.user!.userId },
          ...(pairId ? [{ pairId }] : []),
        ],
      },
    });

    if (!recording) {
      res.status(404).json({ error: 'Recording not found' });
      return;
    }

    const client = getWhisperClient();

    // Fail-open: no Whisper credentials → return null transcript
    if (!client || !req.file) {
      console.warn('[Whisper] No credentials or no audio buffer — skipping transcription');
      res.json({ transcript: null, isDegraded: true });
      return;
    }

    // Stream buffer directly to Azure Whisper (no disk write)
    const ext = req.file.originalname?.split('.').pop() || 'webm';
    const file = await toFile(req.file.buffer, `recording.${ext}`, {
      type: req.file.mimetype,
    });

    const transcription = await Promise.race([
      client.audio.transcriptions.create({
        model: process.env.AZURE_WHISPER_DEPLOYMENT || 'whisper',
        file,
        language: 'en',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Whisper timeout')), 15000),
      ),
    ]);

    const transcript = transcription.text || null;

    // Persist transcript to the recording
    await prisma.recording.update({
      where: { id: recordingId },
      data: { transcript, status: 'completed' },
    });

    res.json({ transcript, isDegraded: false });
  } catch (err) {
    // Fail-open: return null transcript on any error
    console.error('[Whisper] Transcription failed (fail-open):', err);
    res.json({ transcript: null, isDegraded: true });
  }
});

// GET /api/recordings — list user's recordings
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const pairId = getPairId(req);
    const recordings = await prisma.recording.findMany({
      where: pairId ? { pairId } : { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ recordings });
  } catch (err) {
    console.error('Recordings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

export default router;
