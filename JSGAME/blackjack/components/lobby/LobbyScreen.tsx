import { useEffect, useState } from "react";
import {
  clearAuthToken, clearUnifiedAuthToken, getAuthToken, getUnifiedAuthToken,
  setAuthToken, setUnifiedAuthToken,
} from "../../services/authSession";
import { getGameServer, getTableAuthority, UNIFIED_AUTH_SERVER } from "../../services/serverConfig";

interface LobbyScreenProps { onEnterTable: (tableId: string) => void; }
interface User { account: string; displayName: string; email: string; bankroll: number; playSeconds: number; avatarData?: string | null; }
const TABLE_CAPACITY = 20; const OPEN_TABLES = 5;
const DEFAULT_AVATAR = `${window.location.pathname.includes("/dist/") ? "../images" : "/images"}/default.png`;

async function compressAvatar(file: File) {
  const source = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve) => { const next = new Image(); next.onload = () => resolve(next); next.src = source; });
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 160;
  const context = canvas.getContext("2d")!; const side = Math.min(image.width, image.height); const x = (image.width - side) / 2; const y = (image.height - side) / 2;
  context.drawImage(image, x, y, side, side, 0, 0, 160, 160);
  return canvas.toDataURL("image/jpeg", .76);
}

async function jsonRequest(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "操作失败，请重试。");
  return body;
}

export function LobbyScreen({ onEnterTable }: LobbyScreenProps) {
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(() => !getUnifiedAuthToken());
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [identity, setIdentity] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [gameToken, setGameToken] = useState(() => getAuthToken());
  const server = getGameServer();

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const exchangeSession = async (sharedToken: string) => {
    const body = await jsonRequest(`${server}/api/auth/sso`, {
      method: "POST", headers: { Authorization: `Bearer ${sharedToken}`, Accept: "application/json" },
    });
    setAuthToken(body.token);
    setGameToken(body.token);
    setUser(body.user);
    setError("");
    return body.user as User;
  };

  useEffect(() => {
    const sharedToken = getUnifiedAuthToken();
    if (!sharedToken) { clearAuthToken(); setGameToken(null); setUser(null); setProfileOpen(true); return; }
    const existingGameToken = getAuthToken();
    const restore = existingGameToken
      ? jsonRequest(`${server}/api/auth/me`, { headers: { Authorization: `Bearer ${existingGameToken}` } })
          .then((body) => { setGameToken(existingGameToken); setUser(body.user); })
          .catch(() => exchangeSession(sharedToken))
      : exchangeSession(sharedToken);
    void restore.catch(() => setError("无法连接游戏服务器，请稍后重试。"));
  }, [server]);

  const sendCode = async () => {
    setSendingCode(true); setError("");
    try {
      const body = await jsonRequest(`${UNIFIED_AUTH_SERVER}/auth/send-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authMethod === "email" ? { email: identity } : { phoneNumber: identity }),
      });
      setVerificationId(body.verificationId); setCode("");
      setResendSeconds(Number(body.cooldownSeconds) || 60);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "验证码发送失败。"); }
    finally { setSendingCode(false); }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault(); setVerifying(true); setError("");
    try {
      if (!verificationId) throw new Error("请先获取验证码。");
      const body = await jsonRequest(`${UNIFIED_AUTH_SERVER}/auth/verify-code`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, code, displayName }),
      });
      setUnifiedAuthToken(body.token);
      await exchangeSession(body.token);
      setProfileOpen(false); setCode(""); setVerificationId("");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "登录失败。"); }
    finally { setVerifying(false); }
  };

  const saveProfile = async (file?: File) => {
    if (!gameToken || !user) return;
    try {
      const avatarData = file ? await compressAvatar(file) : user.avatarData ?? null;
      const body = await jsonRequest(`${server}/api/auth/profile`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${gameToken}` },
        body: JSON.stringify({ displayName: user.displayName, avatarData }),
      });
      setUser(body.user);
    } catch { setError("资料保存失败，请稍后重试。"); }
  };

  const claimBankroll = async () => {
    if (!gameToken) return;
    try {
      const body = await jsonRequest(`${server}/api/auth/claim-bankroll`, { method: "POST", headers: { Authorization: `Bearer ${gameToken}` } });
      setError(""); setUser(body.user);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "领取失败，请稍后重试。"); }
  };

  const logout = async () => {
    const sharedToken = getUnifiedAuthToken();
    if (gameToken) void fetch(`${server}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${gameToken}` } }).catch(() => undefined);
    if (sharedToken) void fetch(`${UNIFIED_AUTH_SERVER}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${sharedToken}` } }).catch(() => undefined);
    clearAuthToken(); clearUnifiedAuthToken(); setGameToken(null); setUser(null); setProfileOpen(true);
  };

  return (
    <main className="lobby-page">
      <header className="lobby-header">
        <div><p>PRIVATE CLUB · 21</p><h1>BLACKJACK 大厅</h1></div>
        <button className="lobby-account" onClick={() => setProfileOpen(true)}><img src={user?.avatarData || DEFAULT_AVATAR} alt="用户头像" /><span>{user?.displayName ?? "登录 / 注册"}</span></button>
      </header>
      <section className="lobby-intro"><span>{user ? "选择一张牌桌入座" : "请先登录"}</span><strong>当前开放 5 桌，另预留 15 桌扩展位置</strong></section>
      {profileOpen && (
        <section className="account-modal" role="dialog" aria-modal="true" aria-label={user ? "账号资料" : "GAO LAB 登录"}>
          {user ? <form className="account-card" onSubmit={(event) => event.preventDefault()}>
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="关闭">×</button>
            <p className="auth-eyebrow">GAO LAB ACCOUNT</p><h2>账号资料</h2>
            <label className="avatar-upload"><img src={user.avatarData || DEFAULT_AVATAR} alt="用户头像" /><input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void saveProfile(event.target.files[0])} /></label>
            <input value={user.displayName} maxLength={20} aria-label="显示名称" onChange={(event) => setUser({ ...user, displayName: event.target.value })} onBlur={() => void saveProfile()} />
            <p>账号：{user.account}</p><p>邮箱：{user.email}</p><p>个人赌资：{user.bankroll.toLocaleString()} $</p>
            {user.bankroll < 100 && <button type="button" onClick={() => void claimBankroll()}>领取 100 赌资</button>}
            <small>{user.bankroll < 100 ? "赌资低于 100 时可领取一次 100 赌资。" : error}</small>
            <p>游玩时长：{Math.floor(user.playSeconds / 60)} 分钟</p>
            <button type="button" onClick={() => void logout()}>退出 GAO LAB 账号</button>
          </form> : <form className="account-card auth-card" onSubmit={verifyCode}>
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="关闭">×</button>
            <p className="auth-eyebrow">GAO LAB ACCOUNT</p><h2>验证码登录</h2><p className="auth-copy">登录后可同时使用 Blackjack 与 Laogao GPT。</p>
            <div className="auth-tabs">
              <button type="button" className={authMethod === "email" ? "is-active" : ""} onClick={() => { setAuthMethod("email"); setVerificationId(""); }}>邮箱</button>
              <button type="button" className={authMethod === "phone" ? "is-active" : ""} onClick={() => { setAuthMethod("phone"); setVerificationId(""); }}>手机号</button>
            </div>
            <label>{authMethod === "email" ? "邮箱" : "中国大陆手机号"}<input type={authMethod === "email" ? "email" : "tel"} required value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={authMethod === "email" ? "name@example.com" : "13800138000"} /></label>
            <div className="auth-code-row"><label>验证码<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={!verificationId} onChange={(event) => setCode(event.target.value)} placeholder="6 位验证码" /></label><button type="button" disabled={sendingCode || resendSeconds > 0} onClick={() => void sendCode()}>{sendingCode ? "发送中…" : resendSeconds > 0 ? `${resendSeconds} 秒后重发` : verificationId ? "重新发送" : "获取验证码"}</button></div>
            <label>昵称（首次登录选填）<input maxLength={20} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="你的昵称" /></label>
            <small>{error}</small><button className="auth-confirm" disabled={verifying || !verificationId}>{verifying ? "验证中…" : "验证并登录"}</button>
          </form>}
        </section>
      )}
      <section className="lobby-grid">
        {Array.from({ length: TABLE_CAPACITY }, (_, index) => {
          const number = index + 1; const open = number <= OPEN_TABLES;
          const tableId = `table-${number}`; const authority = getTableAuthority(tableId);
          return <button className={`lobby-table ${open ? "is-open" : "is-reserved"}`} disabled={!open || !user} onClick={() => onEnterTable(tableId)} key={number}><span className="lobby-table__number">{String(number).padStart(2, "0")}</span>{open && <span className={`lobby-table__region is-${authority}`}>{authority === "tencent" ? "国内桌" : "海外桌"}</span>}<span className="lobby-table__felt"><i>21</i></span><strong>{open ? "进入牌桌" : "预留桌位"}</strong><small>{open ? "最多 2 名玩家" : "即将开放"}</small></button>;
        })}
      </section>
    </main>
  );
}
