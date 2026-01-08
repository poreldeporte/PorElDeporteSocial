ALTER TABLE public.communities
  ALTER COLUMN game_notification_times_local
  SET DEFAULT ARRAY['09:00'::time, '12:00'::time, '15:00'::time];

UPDATE public.communities
  SET game_notification_times_local = confirmation_reminders_local_times
  WHERE array_length(game_notification_times_local, 1) IS NULL
     OR array_length(game_notification_times_local, 1) = 0;
