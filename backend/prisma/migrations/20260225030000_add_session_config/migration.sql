-- CreateTable
CREATE TABLE IF NOT EXISTS "session_configs" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "phases" JSONB NOT NULL DEFAULT '[]',
    "totalMinutes" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "session_configs_weekId_key" ON "session_configs"("weekId");

-- AddForeignKey
ALTER TABLE "session_configs" ADD CONSTRAINT "session_configs_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
