export const MAINLAND_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/blackjack";
export const GLOBAL_SERVER = "https://game-api.laogao.online";
export const DEFAULT_SERVER = MAINLAND_SERVER;
export const UNIFIED_AUTH_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/api";
const ROUTE_CACHE_KEY = "blackjack-region-route-v3";
const ROUTE_CACHE_MS = 5 * 60_000;

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

export async function selectGameServer() {
  if (import.meta.env.DEV) return getGameServer();
  try {
    const cached = JSON.parse(sessionStorage.getItem(ROUTE_CACHE_KEY) || "null") as { server?: string; expiresAt?: number } | null;
    if (cached?.expiresAt && cached.expiresAt > Date.now() && [MAINLAND_SERVER, GLOBAL_SERVER].includes(cached.server || "")) {
      return cached.server!;
    }
  } catch { /* Probe again when cached routing data is invalid. */ }

  const probe = async (server: string) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3_000);
    const startedAt = performance.now();
    try {
      const response = await fetch(`${server}/health?route_probe=${Date.now()}`, { cache: "no-store", signal: controller.signal });
      return response.ok ? { server, latency: performance.now() - startedAt } : null;
    } catch { return null; }
    finally { window.clearTimeout(timer); }
  };
  const results = (await Promise.all([probe(MAINLAND_SERVER), probe(GLOBAL_SERVER)]))
    .filter((result): result is { server: string; latency: number } => Boolean(result))
    .sort((left, right) => left.latency - right.latency);
  const winner = results[0]?.server ?? DEFAULT_SERVER;
  sessionStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify({ server: winner, expiresAt: Date.now() + ROUTE_CACHE_MS }));
  return winner;
}
