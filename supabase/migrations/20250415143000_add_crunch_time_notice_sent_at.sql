ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS crunch_time_notice_sent_at TIMESTAMPTZ;
