-- CreateTable: GameSession
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "gmUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_code_key" ON "GameSession"("code");

-- CreateIndex
CREATE INDEX "GameSession_gmUserId_status_idx" ON "GameSession"("gmUserId", "status");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_packId_fkey" FOREIGN KEY ("packId") REFERENCES "GamePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_gmUserId_fkey" FOREIGN KEY ("gmUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GameSessionEvent
CREATE TABLE "GameSessionEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 0,
    "phase" TEXT,
    "actionKey" TEXT,
    "actionTitle" TEXT,
    "actionVariant" TEXT,
    "actionResult" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "panic" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameSessionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSessionEvent_sessionId_createdAt_idx" ON "GameSessionEvent"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "GameSessionEvent" ADD CONSTRAINT "GameSessionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
