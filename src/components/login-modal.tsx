"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type View = "entry" | "login" | "apply";

const S = {
  bg: "#FEFAF2",
  border: "rgba(180,140,70,0.25)",
  text: "#3D2B10",
  muted: "#9A7850",
  gold: "#C8901A",
  btn: "#C8901A",
  btnHover: "#A07010",
};

function Overlay({ onClose }: { onClose?: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 299,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        background: S.bg,
        border: `1px solid ${S.border}`,
        borderRadius: 20,
        padding: "36px 40px",
        width: 380,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        pointerEvents: "all",
      }}>
        {children}
      </div>
    </div>
  );
}

function GoldBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "11px 0",
        background: hov ? S.btnHover : S.btn,
        color: "#fff", border: "none", borderRadius: 10,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
        transition: "background 0.15s",
      }}>
      {children}
    </button>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "10px 0",
        background: hov ? "rgba(180,140,70,0.08)" : "transparent",
        color: S.muted, border: `1px solid ${S.border}`,
        borderRadius: 10, fontWeight: 600, fontSize: 13,
        cursor: "pointer", transition: "background 0.15s",
      }}>
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{
      width: "100%", boxSizing: "border-box",
      padding: "10px 12px",
      background: "#FFF8EC", border: `1px solid ${S.border}`,
      borderRadius: 8, fontSize: 13, color: S.text,
      outline: "none",
      ...props.style,
    }} />
  );
}

// 密码输入框（按住小眼睛可查看明文）
function PasswordInput({ value, onChange, placeholder, onKeyDown }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 36px 10px 12px",
          background: "#FFF8EC", border: `1px solid ${S.border}`,
          borderRadius: 8, fontSize: 13, color: S.text, outline: "none",
        }}
      />
      <button
        type="button"
        onMouseDown={() => setShow(true)}
        onMouseUp={() => setShow(false)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(true)}
        onTouchEnd={() => setShow(false)}
        style={{
          position: "absolute", right: 10, top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: S.muted, padding: 2, lineHeight: 0,
        }}
        title="按住查看密码"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ─── Entry View ────────────────────────────────────────────────────────────────
function EntryView({ onAnon, onLogin, onApply }: {
  onAnon: () => void; onLogin: () => void; onApply: () => void;
}) {
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: S.text, fontFamily: "var(--font-caveat)" }}>
          The Next Move
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: S.muted }}>
          &quot;Where you go, you go forward.&quot;
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <GoldBtn onClick={onLogin}>已有账号，登录</GoldBtn>
        <GhostBtn onClick={onApply}>还没有账号，提交申请</GhostBtn>
        <button onClick={onAnon} style={{
          background: "none", border: "none", cursor: "pointer",
          color: S.muted, fontSize: 12, marginTop: 4, textDecoration: "underline",
        }}>
          跳过，以访客身份浏览
        </button>
      </div>
    </>
  );
}

// ─── Login View ─────────────────────────────────────────────────────────────────
function LoginView({ onBack }: { onBack?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !pwd) { setErr("请填写邮箱和密码"); return; }
    setLoading(true); setErr("");
    const { error } = await signIn(email, pwd);
    setLoading(false);
    if (error) {
      if (error.includes("Email not confirmed") || error.includes("email_not_confirmed")) {
        setErr("邮箱未验证，请联系管理员开通或在 Supabase 确认邮件");
      } else if (error.includes("Invalid login") || error.includes("invalid_credentials")) {
        setErr("邮箱或密码错误");
      } else {
        setErr(`登录失败：${error}`);
      }
    }
  };

  return (
    <>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, fontSize: 12, marginBottom: 16 }}>
        ← 返回
      </button>
      <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: S.text }}>登录</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input type="email" placeholder="请输入邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        <PasswordInput
          value={pwd}
          onChange={setPwd}
          placeholder="请输入密码"
          onKeyDown={e => e.key === "Enter" && handle()}
        />
        {err && <p style={{ margin: 0, fontSize: 12, color: "#c0392b" }}>{err}</p>}
        <GoldBtn onClick={handle}>{loading ? "登录中…" : "登录"}</GoldBtn>
      </div>
    </>
  );
}

// ─── Apply View ──────────────────────────────────────────────────────────────────
function ApplyView({ onBack, onSuccess }: { onBack?: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async () => {
    if (!email) { setErr("请填写邮箱"); return; }
    if (!pwd) { setErr("请填写密码"); return; }
    if (pwd.length < 6) { setErr("密码至少 6 位"); return; }
    setLoading(true); setErr("");
    const { error } = await supabase.from("pending_applications").insert({
      email, desired_password: pwd, note: note || null,
    });
    setLoading(false);
    if (error) { setErr("提交失败，请稍后重试"); return; }
    setDone(true);
  };

  if (done) return (
    <div style={{ position: "relative", textAlign: "center", padding: "20px 0" }}>
      <button onClick={onSuccess} style={{
        position: "absolute", top: -8, right: -8,
        background: "none", border: "none", cursor: "pointer",
        color: S.muted, fontSize: 18, lineHeight: 1, padding: 4,
      }}>×</button>
      <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
      <p style={{ color: S.text, fontWeight: 700 }}>申请已提交！</p>
      <p style={{ color: S.muted, fontSize: 12 }}>管理员审核后会为你开通账号</p>
      <div style={{ textAlign: "right", marginTop: 20 }}>
        <button onClick={onSuccess} style={{
          background: "none", border: "none", cursor: "pointer",
          color: S.muted, fontSize: 12, textDecoration: "underline",
        }}>
          欢迎以访客身份浏览 →
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, fontSize: 12, marginBottom: 16 }}>
        ← 返回
      </button>
      <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: S.text }}>申请正式账号</h2>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: S.muted }}>提交后由管理员审核开通</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input type="email" placeholder="请输入邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        <PasswordInput value={pwd} onChange={setPwd} placeholder="请输入密码" />
        <p style={{ margin: "-4px 0 0", fontSize: 11, color: S.muted }}>密码至少 6 位，建议包含字母和数字</p>
        <Input placeholder="备注（选填）" value={note} onChange={e => setNote(e.target.value)} />
        {err && <p style={{ margin: 0, fontSize: 12, color: "#c0392b" }}>{err}</p>}
        <GoldBtn onClick={handle}>{loading ? "提交中…" : "提交申请"}</GoldBtn>
      </div>
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────────
export function LoginModal({
  canClose = false,
  initialView = "entry",
  onClose,
}: {
  canClose?: boolean;
  initialView?: View;
  onClose?: () => void;
}) {
  const { setAnon } = useAuth();
  const [view, setView] = useState<View>(initialView as View);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleAnon = () => setAnon();
  const handleClose = () => {
    if (onClose) onClose();
    else if (canClose) handleAnon();
  };

  // 匿名用户从 Header 触发的弹窗：返回 = 关弹窗
  // 首次访问弹窗：返回 = 回 entry view
  const handleBack = canClose ? handleClose : () => setView("entry");

  if (!mounted) return null;

  return createPortal(
    <>
      <Overlay onClose={canClose ? handleClose : undefined} />
      <Card>
        {view === "entry" && (
          <EntryView
            onAnon={handleAnon}
            onLogin={() => setView("login")}
            onApply={() => setView("apply")}
          />
        )}
        {view === "login" && <LoginView onBack={handleBack} />}
        {view === "apply" && (
          <ApplyView onBack={handleBack} onSuccess={canClose ? handleClose : handleAnon} />
        )}
      </Card>
    </>,
    document.body
  );
}

// ─── 修改密码 Modal ────────────────────────────────────────────────────────────
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { updatePassword, signIn, user } = useAuth();
  const [current, setCurrent] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handle = async () => {
    if (!current) { setErr("请输入当前密码"); return; }
    if (!pwd) { setErr("请输入新密码"); return; }
    if (pwd.length < 6) { setErr("密码至少 6 位"); return; }
    if (pwd !== confirm) { setErr("两次密码不一致"); return; }
    if (!user?.email) { setErr("无法获取用户信息，请重新登录"); return; }
    setLoading(true); setErr("");
    // 先用当前密码重新登录，刷新 session
    const { error: signInErr } = await signIn(user.email, current);
    if (signInErr) { setLoading(false); setErr("当前密码错误"); return; }
    // session 已刷新，再修改密码
    const { error } = await updatePassword(pwd);
    setLoading(false);
    if (error) { setErr(`修改失败：${error}`); return; }
    setOk(true);
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <Overlay onClose={onClose} />
      <Card>
        {ok ? (
          <div style={{ position: "relative", textAlign: "center", padding: "20px 0" }}>
            <button onClick={onClose} style={{
              position: "absolute", top: -8, right: -8,
              background: "none", border: "none", cursor: "pointer",
              color: S.muted, fontSize: 18, lineHeight: 1, padding: 4,
            }}>×</button>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
            <p style={{ color: S.text, fontWeight: 700, margin: "0 0 6px" }}>密码已修改</p>
            <p style={{ color: S.muted, fontSize: 12, margin: 0 }}>下次登录时使用新密码</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: S.text }}>修改密码</h2>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: S.muted, fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <PasswordInput value={current} onChange={setCurrent} placeholder="当前密码" />
              <PasswordInput value={pwd} onChange={setPwd} placeholder="新密码（至少 6 位）" />
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="再次输入新密码"
                onKeyDown={e => e.key === "Enter" && handle()} />
              {err && <p style={{ margin: 0, fontSize: 12, color: "#c0392b" }}>{err}</p>}
              <GoldBtn onClick={handle}>{loading ? "提交中…" : "确认修改"}</GoldBtn>
            </div>
          </>
        )}
      </Card>
    </>,
    document.body
  );
}
