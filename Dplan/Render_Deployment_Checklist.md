# Render Deployment Checklist (Video + Guided Flow)

Last updated: 2026-02-11

## Goal
Deploy Lexical Republic so:
- Students follow guided flow (no free roam).
- Teacher controls `clip_a -> activity -> clip_b`.
- Canva and uploaded videos both work.
- Uploaded videos remain available after deploy/restart.

## 1) Services to create on Render
- Backend web service: runs `backend`.
- Frontend static site (or web service): runs `frontend`.
- PostgreSQL database (Render managed DB is fine).
- Optional Redis service if you use Redis features in production.

## 2) Backend environment variables (Render)
Set these on backend service:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<your_render_postgres_url>
JWT_SECRET=<strong_random_secret>
JWT_EXPIRES_IN=7d

FRONTEND_ORIGIN=https://<your-frontend-domain>
COOKIE_SAMESITE=none
PUBLIC_BASE_URL=https://<your-backend-domain>

UPLOAD_DIR=/var/data/uploads
BRIEFING_UPLOAD_DIR=/var/data/uploads/briefings
MAX_FILE_SIZE=10485760
MAX_VIDEO_FILE_SIZE=157286400
```

Notes:
- `COOKIE_SAMESITE=none` is required when frontend and backend are on different domains.
- Use `FRONTEND_ORIGIN` as a comma-separated list if you have multiple allowed frontend domains.

## 3) Frontend environment variables (Render)
Set on frontend build:

```env
VITE_API_BASE_URL=https://<your-backend-domain>/api
```

## 4) Persistent media storage (critical)
If you use true file uploads, do one of these:
- Attach a Render persistent disk and point `UPLOAD_DIR`/`BRIEFING_UPLOAD_DIR` to that disk mount path.
- Or move uploads to object storage (S3/R2) later.

If you do neither, uploaded videos can disappear on redeploy/restart.

## 5) Quick smoke test after deploy
1. Teacher login works.
2. In Teacher Dashboard, set week `nowShowingStage` to `clip_a`.
3. Upload Clip A, save, open student view, confirm video plays in TV.
4. Switch to `activity`, confirm students see checks.
5. Switch to `clip_b`, confirm Clip B gate appears and completes briefing.
6. Confirm direct URL mode also works by setting `videoSource=embed`.

## 6) Current sequencing control behavior
- `clip_a`: students see only Clip A media.
- `activity`: students complete briefing checks.
- `clip_b`: students see Clip B and complete briefing.
- `free`: fallback self-paced mode.

