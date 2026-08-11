ALTER TABLE users ADD COLUMN external_auth_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_external_auth_id_unique ON users(external_auth_id);
