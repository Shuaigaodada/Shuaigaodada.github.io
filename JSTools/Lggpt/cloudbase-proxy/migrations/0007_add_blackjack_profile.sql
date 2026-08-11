ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS blackjack_bankroll BIGINT NOT NULL DEFAULT 500,
    ADD COLUMN IF NOT EXISTS blackjack_play_seconds BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS blackjack_avatar_data TEXT;

ALTER TABLE app_users
    ADD CONSTRAINT app_users_blackjack_bankroll_range
        CHECK (blackjack_bankroll BETWEEN 0 AND 1000000000),
    ADD CONSTRAINT app_users_blackjack_play_seconds_range
        CHECK (blackjack_play_seconds BETWEEN 0 AND 315360000);
