ALTER TABLE events
ADD COLUMN user_id uuid REFERENCES profiles(id);
