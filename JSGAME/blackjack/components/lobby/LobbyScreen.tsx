import { useEffect, useState } from "react";

interface LobbyScreenProps { onEnterTable: (tableId: string) => void; }
interface User { account: string; displayName: string; email: string; bankroll: number; playSeconds: number; avatarData?: string | null; }
const TABLE_CAPACITY = 20; const OPEN_TABLES = 5;
const DEFAULT_SERVER = "https://blackjack-duel.laogao0113.workers.dev";
const DEFAULT_AVATAR = `${window.location.pathname.includes("/dist/") ? "../images" : "/images"}/default.png`;

async function compressAvatar(file: File) {
  const source = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve) => { const next = new Image(); next.onload = () => resolve(next); next.src = source; });
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 160;
  const context = canvas.getContext("2d")!; const side = Math.min(image.width, image.height); const x = (image.width - side) / 2; const y = (image.height - side) / 2;
  context.drawImage(image, x, y, side, side, 0, 0, 160, 160);
  return canvas.toDataURL("image/jpeg", .76);
}

export function LobbyScreen({ onEnterTable }: LobbyScreenProps) {
  const [account, setAccount] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [register, setRegister] = useState(false); const [error, setError] = useState(""); const [user, setUser] = useState<User | null>(null); const [profileOpen, setProfileOpen] = useState(false);
  const server = new URLSearchParams(window.location.search).get("server") ?? DEFAULT_SERVER;
  const token = localStorage.getItem("blackjack-auth-token");
  useEffect(() => { if (token) fetch(`${server}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => setUser(d.user ?? null)).catch(() => setError("无法连接游戏服务器，请稍后重试。")); }, [server, token]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(""); try { const r = await fetch(`${server}/api/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, email, password }) }); const d = await r.json(); if (!r.ok) return setError(d.message ?? "操作失败，请重试。"); localStorage.setItem("blackjack-auth-token", d.token); setUser(d.user); } catch { setError("无法连接游戏服务器，请稍后重试。"); } };
  const saveProfile = async (file?: File) => { const avatarData = file ? await compressAvatar(file) : user?.avatarData ?? null; const r = await fetch(`${server}/api/auth/profile`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ displayName: user?.displayName, avatarData }) }); const d = await r.json(); setUser(d.user); };
  const claimBankroll = async () => { const r = await fetch(`${server}/api/auth/claim-bankroll`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (!r.ok) return setError(d.message); setError(""); setUser(d.user); };
  return <main className="lobby-page"><header className="lobby-header"><div><p>PRIVATE CLUB · 21</p><h1>双人 21 点大厅</h1></div><button className="lobby-account" onClick={() => setProfileOpen(true)}>{user?.avatarData ? <img src={user.avatarData} /> : <img src={DEFAULT_AVATAR} />}<span>{user?.displayName ?? "登录 / 注册"}</span></button></header>
    <section className="lobby-intro"><span>{user ? "选择一张牌桌入座" : "请先登录"}</span><strong>当前开放 5 桌，另预留 15 桌扩展位置</strong></section>
    {profileOpen && <section className="account-modal"><form onSubmit={submit}><button type="button" onClick={() => setProfileOpen(false)}>×</button>{user ? <><label className="avatar-upload"><img src={user.avatarData || DEFAULT_AVATAR} /><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && saveProfile(e.target.files[0])} /></label><input value={user.displayName} onChange={(e) => setUser({ ...user, displayName: e.target.value })} onBlur={() => saveProfile()} /><p>账号：{user.account}</p><p>邮箱：{user.email}</p><p>个人赌资：{user.bankroll.toLocaleString()} $</p>{user.bankroll < 100 && <button type="button" onClick={claimBankroll}>领取 100 赌资</button>}<small>{user.bankroll < 100 ? "赌资低于 100 时可领取一次 100 赌资。" : error}</small><p>游玩时长：{Math.floor(user.playSeconds / 60)} 分钟</p></> : <><h2>{register ? "注册" : "登录"}</h2><input placeholder="用户名" value={account} onChange={(e) => setAccount(e.target.value)} />{register && <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />}<input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} /><button>确认</button><button type="button" onClick={() => setRegister(!register)}>{register ? "去登录" : "去注册"}</button><small>{error}</small></>}</form></section>}
    <section className="lobby-grid">{Array.from({ length: TABLE_CAPACITY }, (_, i) => { const n=i+1, open=n<=OPEN_TABLES; return <button className={`lobby-table ${open ? "is-open" : "is-reserved"}`} disabled={!open || !user} onClick={() => onEnterTable(`table-${n}`)} key={n}><span className="lobby-table__number">{String(n).padStart(2,"0")}</span><span className="lobby-table__felt"><i>21</i></span><strong>{open ? "进入牌桌" : "预留桌位"}</strong><small>{open ? "最多 2 名玩家" : "即将开放"}</small></button>; })}</section>
  </main>;
}
