DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'owner'
      AND enumtypid = 'public.profile_role'::regtype
  ) THEN
    ALTER TYPE public.profile_role ADD VALUE 'owner' BEFORE 'admin';
  END IF;
END;
$$;
