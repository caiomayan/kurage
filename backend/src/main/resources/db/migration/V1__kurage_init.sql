CREATE SEQUENCE kurage_id_internal_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kurage_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    steam_id64 TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    faceit_username VARCHAR(255) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'OWNER')),
    primary_function VARCHAR(20) NOT NULL DEFAULT 'CORINGA',
    secondary_function VARCHAR(20),
    country VARCHAR(2),
    subscription_tier VARCHAR(10) NOT NULL DEFAULT 'FREE',
    subscription_expires_at TIMESTAMPTZ,
    is_verified_pro BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_unique_owner ON users (role) WHERE role = 'OWNER';
CREATE INDEX idx_users_kurage_id ON users (kurage_id);

CREATE TABLE users_faceit (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    faceit_id TEXT NOT NULL UNIQUE,
    level INT NOT NULL CHECK (level >= 1 AND level <= 10),
    elo INT NOT NULL,
    kd_ratio DECIMAL(4,2),
    win_rate INTEGER,
    matches INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_faceit_elo ON users_faceit (elo DESC);

CREATE TABLE player_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kurage_elo INT NOT NULL DEFAULT 200,
    kills INT NOT NULL DEFAULT 0,
    deaths INT NOT NULL DEFAULT 0,
    assists INT NOT NULL DEFAULT 0,
    headshots INT NOT NULL DEFAULT 0,
    rounds_played INT NOT NULL DEFAULT 0,
    matches_played INT NOT NULL DEFAULT 0,
    matches_won INT NOT NULL DEFAULT 0,
    total_damage BIGINT NOT NULL DEFAULT 0,
    last_match_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_player_stats_elo ON player_stats (kurage_elo DESC);

CREATE TABLE ranking_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INT NOT NULL,
    kurage_elo INT NOT NULL,
    snapshot_date DATE NOT NULL,
    UNIQUE (user_id, snapshot_date)
);
CREATE INDEX idx_ranking_snapshot_date ON ranking_snapshots (snapshot_date, position);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) NOT NULL UNIQUE,
    tag VARCHAR(4) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    country VARCHAR(2),
    team_elo INT NOT NULL DEFAULT 200,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE team_ranking_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    position INT NOT NULL,
    team_elo INT NOT NULL,
    snapshot_date DATE NOT NULL,
    UNIQUE (team_id, snapshot_date)
);
CREATE INDEX idx_team_ranking_date ON team_ranking_snapshots (snapshot_date, position);

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_role VARCHAR(20) NOT NULL,
    team_function VARCHAR(20),
    management_role VARCHAR(10) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);

CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE team_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    desired_role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE team_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    target_role VARCHAR(20),
    expires_at TIMESTAMPTZ NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    current_uses INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_invite_link_token ON team_invite_links (token) WHERE is_active = true;

CREATE TABLE user_inventories (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE game_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    hostname VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    game_mode VARCHAR(20) NOT NULL,
    current_map VARCHAR(50),
    current_players INT NOT NULL DEFAULT 0,
    max_players INT NOT NULL,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_visits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visitor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profile_visits_visited ON profile_visits (visited_user_id, visited_at DESC);
