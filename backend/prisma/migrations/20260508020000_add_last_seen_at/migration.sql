-- Add lastSeenAt to Pair and User. Updated by the auth middleware on every
-- authenticated request (throttled to once per minute per actor). Drives the
-- Active/Recent/Idle/Offline indicator on the teacher ClassMonitor.
--
-- Nullable so existing rows are valid until they next make a request.

-- AlterTable
ALTER TABLE "pairs" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
