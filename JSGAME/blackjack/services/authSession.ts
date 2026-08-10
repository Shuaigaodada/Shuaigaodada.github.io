const TOKEN_KEY = "blackjack-auth-token";

export function getAuthToken() {
  const current = sessionStorage.getItem(TOKEN_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(TOKEN_KEY);
  if (!legacy) return null;
  sessionStorage.setItem(TOKEN_KEY, legacy);
  localStorage.removeItem(TOKEN_KEY);
  return legacy;
}

export function setAuthToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthToken() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
