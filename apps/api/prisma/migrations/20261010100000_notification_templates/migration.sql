-- Lets the web app show notifications in the reader's language: a template
-- key plus raw values, rendered client-side. Both nullable; existing rows
-- keep showing their stored English title and message.
ALTER TABLE "Notification" ADD COLUMN "templateKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "params" JSONB;
