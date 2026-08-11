CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx ON public.app_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public.daily_usage (
    user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.user_messages ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES public.app_users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.consume_daily_quota(p_user_id TEXT, p_daily_limit INTEGER)
RETURNS TABLE(allowed BOOLEAN, used INTEGER, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_count INTEGER;
    was_consumed BOOLEAN := FALSE;
    current_day DATE := (NOW() AT TIME ZONE 'Asia/Shanghai')::DATE;
BEGIN
    INSERT INTO public.daily_usage (user_id, usage_date, request_count)
    VALUES (p_user_id, current_day, 1)
    ON CONFLICT (user_id, usage_date) DO UPDATE
        SET request_count = public.daily_usage.request_count + 1,
            updated_at = NOW()
        WHERE public.daily_usage.request_count < p_daily_limit
    RETURNING request_count INTO current_count;

    IF current_count IS NOT NULL THEN
        was_consumed := TRUE;
    ELSE
        SELECT request_count INTO current_count
        FROM public.daily_usage
        WHERE user_id = p_user_id AND usage_date = current_day;
    END IF;

    RETURN QUERY SELECT
        was_consumed,
        current_count,
        GREATEST(0, p_daily_limit - current_count);
END;
$$;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_service_role_all ON public.app_users;
CREATE POLICY app_users_service_role_all ON public.app_users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS app_sessions_service_role_all ON public.app_sessions;
CREATE POLICY app_sessions_service_role_all ON public.app_sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS daily_usage_service_role_all ON public.daily_usage;
CREATE POLICY daily_usage_service_role_all ON public.daily_usage FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT ALL ON TABLE public.app_users TO service_role;
GRANT ALL ON TABLE public.app_sessions TO service_role;
GRANT ALL ON TABLE public.daily_usage TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_daily_quota(TEXT, INTEGER) TO service_role;
