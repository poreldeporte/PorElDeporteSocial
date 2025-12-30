DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_approval_status') THEN
    CREATE TYPE public.profile_approval_status AS ENUM ('pending', 'approved');
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status public.profile_approval_status NOT NULL DEFAULT 'pending';

UPDATE public.profiles
  SET approval_status = 'approved'
  WHERE approval_status = 'pending';
