-- Ensure game_team_members.game_id stays in sync with game_team_id.

CREATE OR REPLACE FUNCTION public.set_game_team_member_game_id()
RETURNS trigger AS $$
DECLARE
  team_game_id uuid;
BEGIN
  SELECT game_id
    INTO team_game_id
    FROM public.game_teams
    WHERE id = NEW.game_team_id;

  IF team_game_id IS NULL THEN
    RAISE EXCEPTION 'game_team_id % not found', NEW.game_team_id;
  END IF;

  IF NEW.game_id IS NULL THEN
    NEW.game_id := team_game_id;
  ELSIF NEW.game_id <> team_game_id THEN
    RAISE EXCEPTION 'game_id % does not match team game_id %', NEW.game_id, team_game_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_team_members_set_game_id ON public.game_team_members;
CREATE TRIGGER game_team_members_set_game_id
  BEFORE INSERT OR UPDATE OF game_team_id, game_id ON public.game_team_members
  FOR EACH ROW EXECUTE FUNCTION public.set_game_team_member_game_id();
