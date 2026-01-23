-- Archive communities when they have zero approved members.

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.communities AS c
SET archived_at = timezone('utc', now())
WHERE archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.community_id = c.id
      AND m.status = 'approved'
  );

CREATE OR REPLACE FUNCTION public.archive_community_if_empty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_id uuid;
  v_approved_count integer;
BEGIN
  v_community_id := COALESCE(NEW.community_id, OLD.community_id);
  IF v_community_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)
    INTO v_approved_count
    FROM public.memberships
    WHERE community_id = v_community_id
      AND status = 'approved';

  IF v_approved_count = 0 THEN
    UPDATE public.communities
      SET archived_at = timezone('utc', now())
      WHERE id = v_community_id
        AND archived_at IS NULL;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS memberships_archive_on_status_update ON public.memberships;
CREATE TRIGGER memberships_archive_on_status_update
AFTER UPDATE OF status ON public.memberships
FOR EACH ROW
EXECUTE PROCEDURE public.archive_community_if_empty();

DROP TRIGGER IF EXISTS memberships_archive_on_delete ON public.memberships;
CREATE TRIGGER memberships_archive_on_delete
AFTER DELETE ON public.memberships
FOR EACH ROW
EXECUTE PROCEDURE public.archive_community_if_empty();
