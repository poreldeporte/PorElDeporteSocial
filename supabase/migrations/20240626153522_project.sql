-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Achievements table
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  progress INTEGER NOT NULL,
  goal INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User Stats table
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES auth.users(id),
  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),
  weekly_post_views INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    number_of_days INT,
    paid_project BOOLEAN DEFAULT FALSE,
    street VARCHAR(255),
    us_zip_code VARCHAR(10),
    project_type VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
-- CREATE INDEX idx_achievements_profile_id ON achievements(profile_id);
-- CREATE INDEX idx_posts_profile_id ON posts(profile_id);
-- CREATE INDEX idx_posts_category_id ON posts(category_id);
-- CREATE INDEX idx_user_stats_profile_id ON user_stats(profile_id);
-- CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
-- CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);

-- Create function for updating 'updated_at' column
-- CREATE OR REPLACE FUNCTION update_modified_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = now();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create triggers for updating 'updated_at' columns
-- CREATE TRIGGER update_achievements_modtime
--     BEFORE UPDATE ON achievements
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_events_modtime
--     BEFORE UPDATE ON events
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_categories_modtime
--     BEFORE UPDATE ON categories
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_posts_modtime
--     BEFORE UPDATE ON posts
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();

-- CREATE TRIGGER update_user_stats_modtime
--     BEFORE UPDATE ON user_stats
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();


-- CREATE TRIGGER update_referrals_modtime
--     BEFORE UPDATE ON referrals
--     FOR EACH ROW
--     EXECUTE FUNCTION update_modified_column();