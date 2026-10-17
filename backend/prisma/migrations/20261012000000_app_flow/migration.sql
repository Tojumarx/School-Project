-- User: profile extras
ALTER TABLE "User" ADD COLUMN "dob" TEXT,
ADD COLUMN "avatar_url" TEXT;

-- Entry: keep existing rows by renaming activity -> description
ALTER TABLE "Entry" RENAME COLUMN "activity" TO "description";
ALTER TABLE "Entry" DROP COLUMN "day",
DROP COLUMN "learnings",
ADD COLUMN "image_url" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN "supervisor_comment" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "student_name" TEXT;

CREATE INDEX "Entry_student_email_idx" ON "Entry"("student_email");
CREATE INDEX "Entry_user_id_idx" ON "Entry"("user_id");

-- Message: private + broadcast messaging between supervisor and students.
-- Old rows had no usable sender/receiver linkage, so they are discarded.
DELETE FROM "Message";
ALTER TABLE "Message" DROP COLUMN "sender_email",
ADD COLUMN "is_broadcast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "read" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "sender_id" SET NOT NULL;

ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_sender_id_fkey";
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Message_sender_id_idx" ON "Message"("sender_id");
CREATE INDEX "Message_receiver_id_idx" ON "Message"("receiver_id");
