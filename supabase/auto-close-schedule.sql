-- Lance la fermeture automatique chaque jour à 21:30 (heure Algérie).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('presencex-auto-close-attendance')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'presencex-auto-close-attendance'
);

SELECT cron.schedule(
  'presencex-auto-close-attendance',
  '30 20 * * *',
  $$
    SELECT net.http_post(
      url := 'https://uhxqgrhdmxfkftdquaht.supabase.co/functions/v1/auto-close-attendance',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"source":"pg_cron"}'::jsonb
    );
  $$
);