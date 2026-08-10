import { useEffect, useState } from "react";
import { clearAuthToken, getAuthToken, setAuthToken } from "../../services/authSession";
import { getGameServer } from "../../services/serverConfig";

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

export function LobbyScreen({ onEnterTable }: LobbyScreenProps) {
  const [account, setAccount] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const server = getGameServer();
  const token = getAuthToken();

  useEffect(() => {
    if (!token) return;
    fetch(`${server}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (result) => ({ ok: result.ok, body: await result.json() }))
      .then(({ ok, body }) => {
        if (!ok) clearAuthToken();
        setUser(ok ? body.user ?? null : null);
      })
      .catch(() => setError("无法连接游戏服务器，请稍后重试。"));
  }, [server, token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await fetch(`${server}/api/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ account, email, password }),
      });
      const body = await result.json();
      if (!result.ok) return setError(body.message ?? "操作失败，请重试。");
      setAuthToken(body.token);
      setUser(body.user);
      setPassword("");
    } catch { setError("无法连接游戏服务器，请稍后重试。"); }
  };

  const saveProfile = async (file?: File) => {
    if (!token || !user) return;
    try {
      const avatarData = file ? await compressAvatar(file) : user.avatarData ?? null;
      const result = await fetch(`${server}/api/auth/profile`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: user.displayName, avatarData }),
      });
      const body = await result.json();
      if (!result.ok) return setError(body.message ?? "资料保存失败。");
      setUser(body.user);
    } catch { setError("资料保存失败，请稍后重试。"); }
  };

  const claimBankroll = async () => {
    if (!token) return;
    try {
      const result = await fetch(`${server}/api/auth/claim-bankroll`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await result.json();
      if (!result.ok) return setError(body.message);
      setError("");
      setUser(body.user);
    } catch { setError("领取失败，请稍后重试。"); }
  };

  const logout = async () => {
    if (token) void fetch(`${server}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    clearAuthToken();
    setUser(null);
    setProfileOpen(false);
  };

  return (
    <main className="lobby-page">
      <header className="lobby-header">
        <div><p>PRIVATE CLUB · 21</p><h1>BLACKJACK 大厅</h1></div>
        <button className="lobby-account" onClick={() => setProfileOpen(true)}><img src={user?.avatarData || DEFAULT_AVATAR} alt="用户头像" /><span>{user?.displayName ?? "登录 / 注册"}</span></button>
      </header>
      <section className="lobby-intro"><span>{user ? "选择一张牌桌入座" : "请先登录"}</span><strong>当前开放 5 桌，另预留 15 桌扩展位置</strong></section>
      {profileOpen && (
        <section className="account-modal">
          <form onSubmit={submit}>
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="关闭">×</button>
            {user ? <>
              <label className="avatar-upload"><img src={user.avatarData || DEFAULT_AVATAR} alt="用户头像" /><input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void saveProfile(event.target.files[0])} /></label>
              <input value={user.displayName} maxLength={20} aria-label="显示名称" onChange={(event) => setUser({ ...user, displayName: event.target.value })} onBlur={() => void saveProfile()} />
              <p>账号：{user.account}</p><p>邮箱：{user.email}</p><p>个人赌资：{user.bankroll.toLocaleString()} $</p>
              {user.bankroll < 100 && <button type="button" onClick={() => void claimBankroll()}>领取 100 赌资</button>}
              <small>{user.bankroll < 100 ? "赌资低于 100 时可领取一次 100 赌资。" : error}</small>
              <p>游玩时长：{Math.floor(user.playSeconds / 60)} 分钟</p>
              <button type="button" onClick={() => void logout()}>退出登录</button>
            </> : <>
              <h2>{register ? "注册" : "登录"}</h2>
              <input placeholder="用户名" autoComplete="username" value={account} onChange={(event) => setAccount(event.target.value)} />
              {register && <input type="email" placeholder="邮箱" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />}
              <input type="password" minLength={10} placeholder="密码（至少 10 位）" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button>确认</button><button type="button" onClick={() => setRegister(!register)}>{register ? "去登录" : "去注册"}</button><small>{error}</small>
            </>}
          </form>
        </section>
      )}
      <section className="lobby-grid">
        {Array.from({ length: TABLE_CAPACITY }, (_, index) => {
          const number = index + 1; const open = number <= OPEN_TABLES;
          return <button className={`lobby-table ${open ? "is-open" : "is-reserved"}`} disabled={!open || !user} onClick={() => onEnterTable(`table-${number}`)} key={number}><span className="lobby-table__number">{String(number).padStart(2, "0")}</span><span className="lobby-table__felt"><i>21</i></span><strong>{open ? "进入牌桌" : "预留桌位"}</strong><small>{open ? "最多 2 名玩家" : "即将开放"}</small></button>;
        })}
      </section>
    </main>
  );
}
