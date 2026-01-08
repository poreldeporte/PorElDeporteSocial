-- Create community membership when a profile is approved.

CREATE OR REPLACE FUNCTION public.add_membership_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id uuid;
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    SELECT id
      INTO v_community_id
      FROM public.communities
      ORDER BY created_at ASC
      LIMIT 1;

    IF v_community_id IS NOT NULL THEN
      INSERT INTO public.memberships (community_id, profile_id)
      VALUES (v_community_id, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_add_membership_on_approval ON public.profiles;

CREATE TRIGGER profiles_add_membership_on_approval
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW
WHEN (NEW.approval_status = 'approved')
EXECUTE PROCEDURE public.add_membership_on_approval();
