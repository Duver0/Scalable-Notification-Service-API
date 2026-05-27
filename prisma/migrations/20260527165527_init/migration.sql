-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'sent', 'failed', 'duplicate');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variables" JSONB,
    "correlationId" TEXT,
    "idempotencyKey" TEXT,
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationJob_idempotencyKey_key" ON "NotificationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationJob_status_idx" ON "NotificationJob"("status");

-- CreateIndex
CREATE INDEX "NotificationJob_idempotencyKey_idx" ON "NotificationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "NotificationJob_createdAt_idx" ON "NotificationJob"("createdAt");

-- AddForeignKey
ALTER TABLE "NotificationJob" ADD CONSTRAINT "NotificationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
