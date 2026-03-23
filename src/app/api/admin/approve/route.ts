import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── 仅 server-side，用 service_role_key（有 Admin 权限）──────────────────────
function adminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase service role key");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── 简单管理员鉴权：Header X-Admin-Token ────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function POST(req: NextRequest) {
  // 鉴权
  const token = req.headers.get("x-admin-token");
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { application_id } = await req.json() as { application_id: string };
  if (!application_id) {
    return NextResponse.json({ error: "application_id required" }, { status: 400 });
  }

  const supabase = adminClient();

  // 1. 取申请信息
  const { data: app, error: fetchErr } = await supabase
    .from("pending_applications")
    .select("email, desired_password, note")
    .eq("id", application_id)
    .single();

  if (fetchErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // 2. 创建 Auth 用户（email 已确认，直接可登录）
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: app.email,
    password: app.desired_password,
    email_confirm: true,              // 跳过邮件验证
  });

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 500 });
  }

  // 3. 删除 pending 记录（或改为 approved = true）
  await supabase.from("pending_applications").delete().eq("id", application_id);

  return NextResponse.json({ ok: true, user_id: created.user?.id });
}

// ── GET: 列出所有待审批申请 ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const { data, error } = await supabase
    .from("pending_applications")
    .select("id, email, note, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}
