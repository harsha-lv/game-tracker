-- Game Tracker Schema (Option B: Master Catalog + User Playthrough Tracking)

DROP TABLE IF EXISTS user_games CASCADE;
DROP TABLE IF EXISTS game_platforms CASCADE;
DROP TABLE IF EXISTS game_developers CASCADE;
DROP TABLE IF EXISTS game_genres CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS developers CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Catalog: Games
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    release_year INTEGER CHECK (release_year >= 1970 AND release_year <= 2100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Catalog: Genres
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Master Catalog: Developers
CREATE TABLE developers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    country VARCHAR(100),
    website VARCHAR(255)
);

-- Master Catalog: Platforms
CREATE TABLE platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Junction Tables (Catalog Associations)
CREATE TABLE game_genres (
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE game_developers (
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    developer_id INTEGER REFERENCES developers(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, developer_id)
);

CREATE TABLE game_platforms (
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, platform_id)
);

-- User Tracking Table: Links a user to a catalog game with playthrough state
CREATE TABLE user_games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Want to Play', 'Currently Playing', 'Completed', 'Dropped', 'On Hold')),
    rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
    review_notes TEXT,
    hours_played NUMERIC(5, 1) DEFAULT 0 CHECK (hours_played >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, game_id)
);

-- Indexes for performance
CREATE INDEX idx_user_games_user_id ON user_games(user_id);
CREATE INDEX idx_user_games_status ON user_games(status);
CREATE INDEX idx_user_games_game_id ON user_games(game_id);
CREATE INDEX idx_games_title ON games(title);

-- Seed default user
INSERT INTO users (username, email) VALUES ('harsha', 'harsha@example.com');
