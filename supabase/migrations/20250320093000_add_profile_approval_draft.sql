DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'profile_approval_status'
      AND e.enumlabel = 'draft'
  ) THEN
    ALTER TYPE public.profile_approval_status ADD VALUE 'draft';
  END IF;
END;
$$;
