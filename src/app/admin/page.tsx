"use client";

import { useState } from "react";

interface Application {
  id: string;
  email: string;
  note: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async (t = token) => {
    setLoading(true); setMsg("");
    const res = await fetch("/api/admin/approve", { headers: { "x-admin-token": t } });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg("Token 错误或无权限"); return; }
    setAuthed(true);
    setApps(json.applications ?? []);
  };

  const approve = async (id: string, email: string) => {
    if (!confirm(`确认为 ${email} 创建账号？`)) return;
    setMsg("");
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: { "x-admin-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: id }),
    });
    const json = await res.json();
    if (json.ok) {
      setMsg(`✅ ${email} 账号已创建`);
      setApps(prev => prev.filter(a => a.id !== id));
    } else {
      setMsg(`❌ 失败：${json.error}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FEFAF2", display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div style={{ width: 480, fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#3D2B10", marginBottom: 24 }}>
          🛡 账号申请审批
        </h1>

        {!authed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="输入 Admin Token"
              value={token}
              onChange={e => setToken(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              style={{
                padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(180,140,70,0.3)",
                background: "#FFF8EC", fontSize: 14, outline: "none",
              }}
            />
            <button onClick={() => load()} disabled={loading} style={{
              padding: "10px 0", borderRadius: 10, border: "none",
              background: "#C8901A", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              {loading ? "验证中…" : "进入"}
            </button>
            {msg && <p style={{ color: "#c0392b", fontSize: 13 }}>{msg}</p>}
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ color: "#9A7850", fontSize: 13 }}>共 {apps.length} 条待审批</span>
              <button onClick={() => load()} style={{
                background: "none", border: "1px solid rgba(180,140,70,0.3)", borderRadius: 7,
                padding: "4px 12px", cursor: "pointer", color: "#9A7850", fontSize: 12,
              }}>刷新</button>
            </div>

            {msg && (
              <p style={{ padding: "10px 14px", borderRadius: 8, background: msg.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
                color: msg.startsWith("✅") ? "#065f46" : "#c0392b", fontSize: 13, marginBottom: 16 }}>
                {msg}
              </p>
            )}

            {apps.length === 0 ? (
              <p style={{ color: "#9A7850", fontSize: 13 }}>暂无待审批申请 🎉</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {apps.map(app => (
                  <div key={app.id} style={{
                    padding: "16px 18px", borderRadius: 12,
                    border: "1px solid rgba(180,140,70,0.25)", background: "#fff",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: "#3D2B10", fontSize: 14 }}>{app.email}</p>
                      {app.note && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9A7850" }}>{app.note}</p>}
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#bbb" }}>
                        {new Date(app.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <button onClick={() => approve(app.id, app.email)} style={{
                      background: "#C8901A", color: "#fff", border: "none",
                      borderRadius: 8, padding: "7px 16px", fontWeight: 700,
                      fontSize: 13, cursor: "pointer", flexShrink: 0,
                    }}>
                      批准
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
