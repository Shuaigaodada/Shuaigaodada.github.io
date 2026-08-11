export const DEFAULT_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/blackjack";
export const UNIFIED_AUTH_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/api";

export function getGameServer() {
  const requested = new URLSearchParams(window.location.search).get("server")?.replace(/\/$/, "");
  if (!import.meta.env.DEV) return DEFAULT_SERVER;
  const localServer = `${window.location.protocol}//${window.location.hostname}:8787`;
  if (!requested) return localServer;
  try {
    const url = new URL(requested);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : localServer;
  } catch {
    return localServer;
  }
}
