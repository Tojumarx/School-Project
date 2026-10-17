-- CreateTable
CREATE TABLE "EntryProof" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "ots" BYTEA,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "bitcoin_height" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "last_checked_at" TIMESTAMP(3),

    CONSTRAINT "EntryProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryProof_entry_id_idx" ON "EntryProof"("entry_id");

-- CreateIndex
CREATE INDEX "EntryProof_status_idx" ON "EntryProof"("status");

-- AddForeignKey
ALTER TABLE "EntryProof" ADD CONSTRAINT "EntryProof_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
