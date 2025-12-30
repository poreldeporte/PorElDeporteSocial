ALTER TABLE public.profiles
  ALTER COLUMN approval_status SET DEFAULT 'draft';

UPDATE public.profiles
  SET approval_status = 'draft'
  WHERE approval_status = 'pending'
    AND (
      first_name IS NULL OR trim(first_name) = ''
      OR last_name IS NULL OR trim(last_name) = ''
      OR email IS NULL OR trim(email) = ''
      OR jersey_number IS NULL
      OR position IS NULL OR trim(position) = ''
      OR birth_date IS NULL
    );
