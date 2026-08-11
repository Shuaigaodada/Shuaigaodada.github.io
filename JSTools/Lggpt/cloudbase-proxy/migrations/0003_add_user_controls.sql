ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 50
        CHECK (daily_limit BETWEEN 0 AND 500),
    ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN NOT NULL DEFAULT FALSE;

GRANT ALL ON TABLE public.app_users TO service_role;
