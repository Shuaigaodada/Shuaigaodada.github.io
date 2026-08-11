export const MAINLAND_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/blackjack";
export const GLOBAL_SERVER = "https://game-api.laogao.online";
export const DEFAULT_SERVER = MAINLAND_SERVER;
export const UNIFIED_AUTH_SERVER = "https://laogao-gpt-proxy-295046-9-1403518541.sh.run.tcloudbase.com/api";
export type TableAuthority = "tencent" | "cloudflare";
export interface RegionLatencies { tencent: number; cloudflare: number; }
const ASSIGNED_ROUTE_PREFIX = "blackjack-assigned-route:";

// A table must never change authority during a match. With the current five-table
// lobby, deterministic assignment guarantees that every player reaches the same
// state owner without depending on a cross-region registry during game play.
const TABLE_AUTHORITIES: Readonly<Record<string, TableAuthority>> = {
  "table-1": "tencent",
  "table-2": "tencent",
  "table-3": "tencent",
  "table-4": "cloudflare",
  "table-5": "cloudflare",
};

export function getTableAuthority(tableId: string): TableAuthority {
  if (typeof sessionStorage !== "undefined") {
    try {
      const route = JSON.parse(sessionStorage.getItem(`${ASSIGNED_ROUTE_PREFIX}${tableId}`) || "null") as { authority?: TableAuthority; expiresAt?: number } | null;
      if (route?.expiresAt && route.expiresAt > Date.now() && (route.authority === "tencent" || route.authority === "cloudflare")) return route.authority;
    } catch { /* Invalid browser state falls back to the deterministic table map. */ }
  }
  return TABLE_AUTHORITIES[tableId] ?? "tencent";
}

export function setAssignedTableAuthority(tableId: string, authority: TableAuthority, expiresAt: number) {
  sessionStorage.setItem(`${ASSIGNED_ROUTE_PREFIX}${tableId}`, JSON.stringify({ authority, expiresAt }));
}

export function getTableServer(tableId: string) {
  return getTableAuthority(tableId) === "cloudflare" ? GLOBAL_SERVER : MAINLAND_SERVER;
}

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

export async function selectGameServer(tableId: string) {
  if (import.meta.env.DEV) return getGameServer();
  return getTableServer(tableId);
}

export async function probeGameRegions(): Promise<RegionLatencies> {
  const probe = async (server: string) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4_000);
    const startedAt = performance.now();
    try {
      const response = await fetch(`${server}/health?lobby_probe=${Date.now()}`, { cache: "no-store", signal: controller.signal });
      return response.ok ? Math.max(1, Math.round(performance.now() - startedAt)) : 10_000;
    } catch { return 10_000; }
    finally { window.clearTimeout(timer); }
  };
  const [tencent, cloudflare] = await Promise.all([probe(MAINLAND_SERVER), probe(GLOBAL_SERVER)]);
  return { tencent, cloudflare };
}
