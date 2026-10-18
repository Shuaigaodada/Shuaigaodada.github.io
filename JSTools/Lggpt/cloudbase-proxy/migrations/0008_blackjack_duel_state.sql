CREATE TABLE IF NOT EXISTS public.blackjack_duel_states (
  table_id TEXT PRIMARY KEY CHECK (table_id ~ '^table-([6-9]|1[0-5])$'),
  revision BIGINT NOT NULL DEFAULT 0,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.blackjack_duel_seats (
  user_id TEXT PRIMARY KEY REFERENCES public.app_users(id),
  table_id TEXT NOT NULL REFERENCES public.blackjack_duel_states(table_id)
);
CREATE TABLE IF NOT EXISTS public.blackjack_duel_ledger (
  table_id TEXT NOT NULL,
  revision BIGINT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.app_users(id),
  delta BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (table_id, revision, user_id)
);
CREATE TABLE IF NOT EXISTS public.blackjack_legacy_seats (
  user_id TEXT PRIMARY KEY REFERENCES public.app_users(id),
  table_id TEXT NOT NULL CHECK(table_id ~ '^table-[1-5]$'),
  owner TEXT NOT NULL
);
CREATE OR REPLACE FUNCTION public.commit_blackjack_duel(
  p_table_id TEXT, p_revision BIGINT, p_state JSONB, p_deltas JSONB
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  current_revision BIGINT;
  player JSONB;
  entry RECORD;
  seat_index INTEGER := 0;
  balance BIGINT;
BEGIN
  IF p_table_id !~ '^table-([6-9]|1[0-5])$' OR p_state->>'tableId' <> p_table_id
     OR (p_state->>'revision')::BIGINT <> p_revision+1 THEN RAISE EXCEPTION 'Invalid duel state'; END IF;
  INSERT INTO blackjack_duel_states(table_id,revision,state) VALUES(p_table_id,0,'{}') ON CONFLICT DO NOTHING;
  SELECT revision INTO current_revision FROM blackjack_duel_states WHERE table_id=p_table_id FOR UPDATE;
  IF current_revision <> p_revision THEN RAISE EXCEPTION 'Duel revision conflict'; END IF;
  -- Lock participants in a stable order. A user can occupy only one new-mode room.
  PERFORM id FROM app_users WHERE id IN (SELECT value->>'userId' FROM jsonb_array_elements(p_state->'players')) ORDER BY id FOR UPDATE;
  DELETE FROM blackjack_duel_seats WHERE table_id=p_table_id AND user_id NOT IN
    (SELECT value->>'userId' FROM jsonb_array_elements(p_state->'players') WHERE value->>'userId' IS NOT NULL);
  FOR player IN SELECT value FROM jsonb_array_elements(p_state->'players') LOOP
    IF player->>'userId' IS NOT NULL THEN
      IF EXISTS(SELECT 1 FROM blackjack_legacy_seats WHERE user_id=player->>'userId') THEN
        RAISE EXCEPTION '请先离开原规则牌桌';
      END IF;
      IF EXISTS(SELECT 1 FROM blackjack_duel_seats WHERE user_id=player->>'userId' AND table_id<>p_table_id) THEN
        RAISE EXCEPTION 'Already seated at another table';
      END IF;
      IF p_table_id ~ '^table-([6-9]|10)$' AND NOT EXISTS(SELECT 1 FROM blackjack_duel_seats WHERE user_id=player->>'userId')
        AND (SELECT blackjack_bankroll FROM app_users WHERE id=player->>'userId')<75 THEN RAISE EXCEPTION '觉醒牌桌入座至少需要 75 赌资'; END IF;
      INSERT INTO blackjack_duel_seats(user_id,table_id) VALUES(player->>'userId',p_table_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  FOR entry IN SELECT value->>'userId' AS uid,SUM((value->>'delta')::BIGINT) AS delta FROM jsonb_array_elements(p_deltas) GROUP BY value->>'userId' ORDER BY value->>'userId' LOOP
    UPDATE app_users SET blackjack_bankroll=blackjack_bankroll+entry.delta
      WHERE id=entry.uid AND blackjack_bankroll+entry.delta BETWEEN 0 AND 1000000000
      RETURNING blackjack_bankroll INTO balance;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    INSERT INTO blackjack_duel_ledger(table_id,revision,user_id,delta,balance_after) VALUES(p_table_id,p_revision+1,entry.uid,entry.delta,balance);
  END LOOP;
  FOR player IN SELECT value FROM jsonb_array_elements(p_state->'players') LOOP
    IF player->>'userId' IS NOT NULL THEN
      SELECT blackjack_bankroll INTO balance FROM app_users WHERE id=player->>'userId';
      p_state := jsonb_set(p_state,ARRAY['players',seat_index::TEXT,'bankroll'],to_jsonb(balance));
    END IF;
    seat_index := seat_index+1;
  END LOOP;
  UPDATE blackjack_duel_states SET revision=p_revision+1,state=p_state,updated_at=NOW() WHERE table_id=p_table_id;
  RETURN p_state;
END;
$$;
-- The legacy engine has in-memory rounds. Retain its lock after a process crash;
-- only recover it after confirming that process is stopped and settling its bets.
CREATE OR REPLACE FUNCTION public.blackjack_legacy_wallet(
  p_user_id TEXT, p_owner TEXT, p_table_id TEXT, p_action TEXT, p_balance BIGINT DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE balance BIGINT;
BEGIN
  SELECT blackjack_bankroll INTO balance FROM app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND OR p_owner IS NULL OR length(p_owner)<16 THEN RAISE EXCEPTION 'Invalid player'; END IF;
  IF p_action='claim' THEN
    IF EXISTS(SELECT 1 FROM blackjack_duel_seats WHERE user_id=p_user_id) THEN RAISE EXCEPTION '请先离开真人对决牌桌'; END IF;
    IF EXISTS(SELECT 1 FROM blackjack_legacy_seats WHERE user_id=p_user_id AND (owner<>p_owner OR table_id<>p_table_id)) THEN RAISE EXCEPTION '请先离开其他牌桌'; END IF;
    INSERT INTO blackjack_legacy_seats VALUES(p_user_id,p_table_id,p_owner) ON CONFLICT DO NOTHING;
  ELSIF p_action='release' THEN
    DELETE FROM blackjack_legacy_seats WHERE user_id=p_user_id AND owner=p_owner AND table_id=p_table_id;
  ELSIF p_action='save' THEN
    IF NOT EXISTS(SELECT 1 FROM blackjack_legacy_seats WHERE user_id=p_user_id AND owner=p_owner) THEN RAISE EXCEPTION 'Seat ownership lost'; END IF;
    IF p_balance IS NULL OR p_balance NOT BETWEEN 0 AND 1000000000 THEN RAISE EXCEPTION 'Invalid balance'; END IF;
    UPDATE app_users SET blackjack_bankroll=p_balance WHERE id=p_user_id; balance:=p_balance;
  ELSE RAISE EXCEPTION 'Invalid wallet action'; END IF;
  RETURN balance;
END;
$$;
CREATE OR REPLACE FUNCTION public.claim_blackjack_bankroll(p_user_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE balance BIGINT;
BEGIN
  SELECT blackjack_bankroll INTO balance FROM app_users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND OR balance>=100 THEN RAISE EXCEPTION '赌资不少于 100，暂时不能领取'; END IF;
  IF EXISTS(SELECT 1 FROM blackjack_duel_seats WHERE user_id=p_user_id) OR EXISTS(SELECT 1 FROM blackjack_legacy_seats WHERE user_id=p_user_id) THEN RAISE EXCEPTION '请先离桌再领取赌资'; END IF;
  UPDATE app_users SET blackjack_bankroll=blackjack_bankroll+100 WHERE id=p_user_id RETURNING blackjack_bankroll INTO balance;
  RETURN balance;
END;
$$;
ALTER TABLE public.blackjack_duel_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackjack_duel_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackjack_duel_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackjack_legacy_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_seats_service ON public.blackjack_legacy_seats FOR ALL TO service_role USING(TRUE) WITH CHECK(TRUE);
CREATE POLICY duel_states_service ON public.blackjack_duel_states FOR ALL TO service_role USING(TRUE) WITH CHECK(TRUE);
CREATE POLICY duel_seats_service ON public.blackjack_duel_seats FOR ALL TO service_role USING(TRUE) WITH CHECK(TRUE);
CREATE POLICY duel_ledger_service ON public.blackjack_duel_ledger FOR ALL TO service_role USING(TRUE) WITH CHECK(TRUE);
REVOKE ALL ON FUNCTION public.commit_blackjack_duel(TEXT,BIGINT,JSONB,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_blackjack_duel(TEXT,BIGINT,JSONB,JSONB) TO service_role;
GRANT ALL ON public.blackjack_duel_states,public.blackjack_duel_seats,public.blackjack_duel_ledger TO service_role;
GRANT ALL ON public.blackjack_legacy_seats TO service_role;
REVOKE ALL ON FUNCTION public.blackjack_legacy_wallet(TEXT,TEXT,TEXT,TEXT,BIGINT), public.claim_blackjack_bankroll(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blackjack_legacy_wallet(TEXT,TEXT,TEXT,TEXT,BIGINT), public.claim_blackjack_bankroll(TEXT) TO service_role;
