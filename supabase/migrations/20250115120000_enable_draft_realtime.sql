-- Enable realtime broadcasts for draft tables

CREATE OR REPLACE FUNCTION public.broadcast_changes_for_table()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    realtime.broadcast_changes(
      TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS games_broadcast_trigger ON public.games;
CREATE TRIGGER games_broadcast_trigger
  AFTER UPDATE OF draft_status, draft_turn, draft_direction ON public.games
  FOR EACH ROW
  WHEN (
    (OLD.draft_status IS DISTINCT FROM NEW.draft_status)
    OR (OLD.draft_turn IS DISTINCT FROM NEW.draft_turn)
    OR (OLD.draft_direction IS DISTINCT FROM NEW.draft_direction)
  )
  EXECUTE FUNCTION public.broadcast_changes_for_table();

DROP TRIGGER IF EXISTS game_teams_broadcast_trigger ON public.game_teams;
CREATE TRIGGER game_teams_broadcast_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.game_teams
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_for_table();

DROP TRIGGER IF EXISTS game_team_members_broadcast_trigger ON public.game_team_members;
CREATE TRIGGER game_team_members_broadcast_trigger
  AFTER INSERT OR DELETE ON public.game_team_members
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_changes_for_table();

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'allow_auth_select_broadcasts'
  ) THEN
    CREATE POLICY allow_auth_select_broadcasts ON realtime.messages
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'allow_auth_insert_broadcasts'
  ) THEN
    CREATE POLICY allow_auth_insert_broadcasts ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END;
$$;
