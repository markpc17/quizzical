-- GDPR data retention: auto-delete expired and finished games.
--
-- Requires the pg_cron extension to be enabled first.
-- In the Supabase dashboard go to: Database → Extensions → search "pg_cron" → enable.
-- Then run this migration in the SQL editor.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing jobs with these names so re-running is idempotent.
SELECT cron.unschedule(jobname)
FROM   cron.job
WHERE  jobname IN ('delete-expired-games', 'delete-finished-games');

-- Delete games whose lobby/play window has elapsed (expires_at is set to
-- ~24 h after creation for all new games; cascades to players, rounds,
-- questions, answers).
SELECT cron.schedule(
  'delete-expired-games',
  '0 3 * * *',
  $$DELETE FROM games WHERE expires_at IS NOT NULL AND expires_at < NOW()$$
);

-- Safety net: delete finished games older than 24 h regardless of expires_at,
-- so rows from before the expiry column was added don't accumulate.
SELECT cron.schedule(
  'delete-finished-games',
  '30 3 * * *',
  $$DELETE FROM games WHERE status = 'finished' AND created_at < NOW() - INTERVAL '24 hours'$$
);
