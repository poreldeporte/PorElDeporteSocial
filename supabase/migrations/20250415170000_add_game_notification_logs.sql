CREATE TABLE IF NOT EXISTS public.game_notification_logs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS game_notification_logs_unique
  ON public.game_notification_logs (game_id, type, send_at);

CREATE INDEX IF NOT EXISTS game_notification_logs_send_at
  ON public.game_notification_logs (send_at);
