const GAME_TOKEN_KEY = "blackjack-auth-token";
const GLOBAL_GAME_TOKEN_KEY = "blackjack-auth-token-global";
const SHARED_TOKEN_KEY = "gao-lab-auth-token-v1";
const LEGACY_SHARED_TOKEN_KEY = "laogao-gpt-auth-token-v1";
const SHARED_COOKIE = "gao_lab_session";

function cookieToken() {
  const prefix = `${SHARED_COOKIE}=`;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : "";
}

function writeCookie(token: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = token
    ? `${SHARED_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${secure}`
    : `${SHARED_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

export function getUnifiedAuthToken() {
  const current = cookieToken() || localStorage.getItem(SHARED_TOKEN_KEY) || localStorage.getItem(LEGACY_SHARED_TOKEN_KEY) || "";
  if (current) {
    localStorage.setItem(SHARED_TOKEN_KEY, current);
    localStorage.removeItem(LEGACY_SHARED_TOKEN_KEY);
    writeCookie(current);
  }
  return current || null;
}

export function setUnifiedAuthToken(token: string) {
  localStorage.setItem(SHARED_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_SHARED_TOKEN_KEY);
  writeCookie(token);
}

export function clearUnifiedAuthToken() {
  localStorage.removeItem(SHARED_TOKEN_KEY);
  localStorage.removeItem(LEGACY_SHARED_TOKEN_KEY);
  writeCookie("");
}

export function getAuthToken() {
  const current = sessionStorage.getItem(GAME_TOKEN_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(GAME_TOKEN_KEY);
  if (!legacy) return null;
  sessionStorage.setItem(GAME_TOKEN_KEY, legacy);
  localStorage.removeItem(GAME_TOKEN_KEY);
  return legacy;
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(GAME_TOKEN_KEY, token);
  localStorage.removeItem(GAME_TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(GAME_TOKEN_KEY);
  sessionStorage.removeItem(GLOBAL_GAME_TOKEN_KEY);
  localStorage.removeItem(GAME_TOKEN_KEY);
  localStorage.removeItem(GLOBAL_GAME_TOKEN_KEY);
}

function regionalTokenKey(server: string) {
  return server.includes("game-api.laogao.online") ? GLOBAL_GAME_TOKEN_KEY : GAME_TOKEN_KEY;
}

export function getRegionalAuthToken(server: string) {
  return sessionStorage.getItem(regionalTokenKey(server));
}

export function setRegionalAuthToken(server: string, token: string) {
  sessionStorage.setItem(regionalTokenKey(server), token);
}

export function clearRegionalAuthToken(server: string) {
  sessionStorage.removeItem(regionalTokenKey(server));
}
