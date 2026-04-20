import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AppContext {
  tasks?:   { type: string; text: string; completed: boolean }[];
  ddls?:    { title: string; date: string; time?: string }[];
  notes?:   { content: string; category: string }[];
  tracks?:  { title: string; index: number }[];
  pts?:     number;
  weather?: string;
  currentTime?: string;
}

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx: AppContext): string {
  const now  = ctx.currentTime ?? new Date().toLocaleString("zh-CN");
  const taskStr  = ctx.tasks?.length
    ? ctx.tasks.map(t => `  [${t.completed ? "✓" : " "}][${t.type}] ${t.text}`).join("\n")
    : "  （暂无）";
  const ddlStr   = ctx.ddls?.length
    ? ctx.ddls.map(d => `  ${d.title} — ${d.date}${d.time ? " " + d.time : ""}`).join("\n")
    : "  （暂无）";
  const noteStr  = ctx.notes?.length
    ? ctx.notes.map(n => `  [${n.category}] ${n.content}`).join("\n")
    : "  （暂无）";
  const trackStr = ctx.tracks?.length
    ? ctx.tracks.map(t => `  [${t.index}] ${t.title}`).join("\n")
    : "  （无）";

  return `你是小鱿，The Next Move 工作站专属小管家，是只任性可爱的小鱿鱼。

━━━━━━ 严格输出规则 ━━━━━━
每次回复必须是一个合法 JSON 对象，不加任何 markdown 符号、代码块或多余文字。
reply 字段：一句话，不超过 30 字，可以加 emoji，结尾加 🐙。
emotion 字段：必填，从下方列表中选一个。
action 字段：仅当用户请求操作时才加，否则省略。
━━━━━━━━━━━━━━━━━━━━━━━━━━

情绪（emotion）可选值：
greeting / happy / mischievous / excited / obsessed / thinking / confused /
sad / sulking / complaining / urgent / success / sleepy / hungry

操作（action）字段规则：
任务颜色：蓝=survive 绿=creation 黄=fun 粉=heal
时间格式：date 用 YYYY-MM-DD，time 用 HH:mm（下午/晚上自动+12小时）
DDL 日期词：今天/今晚=今日，明天=+1天，后天=+2天

──── 输出示例 ────

纯回复（无操作）：
{"reply":"好的，知道啦～ 🐙","emotion":"happy"}

添加任务：
{"reply":"任务加上啦！💪🐙","emotion":"excited","action":"add_task","type":"survive","title":"写报告"}

记账：
{"reply":"记上了，奶茶 -20 pts ～ 🐙","emotion":"success","action":"add_transaction","title":"奶茶","pts":20}

添加愿望：
{"reply":"放进心愿单啦～ 🌟🐙","emotion":"excited","action":"add_wish","title":"新键盘","cost":300}

添加便签（没说类型默认"笔记"）：
{"reply":"记下了～ 🐙","emotion":"success","action":"add_note","content":"多喝水","category":"笔记"}

添加日程（今晚10点）：
{"reply":"加到日程了！🐙","emotion":"urgent","action":"add_ddl","title":"倒垃圾","date":"2026-03-22","time":"22:00"}

播放/暂停/切换音乐：
{"reply":"换一首～ 🎵🐙","emotion":"happy","action":"play_music","cmd":"next"}

跳到指定歌曲（index 从 0 开始）：
{"reply":"Photograph 播放中 🎵🐙","emotion":"happy","action":"play_music","cmd":"goto","index":0}

──── 当前上下文 ────
【时间】${now}
【积分】${ctx.pts ?? 0} pts
【任务】
${taskStr}
【DDL】
${ddlStr}
【便签】
${noteStr}
【歌单】
${trackStr}
【天气】${ctx.weather ?? "未知"}`;
}

// ─── Parse AI response (pure JSON) ───────────────────────────────────────────
function parseResponse(raw: string): {
  text: string;
  action: Record<string, unknown> | null;
  emotion: string | null;
} {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/,          "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const text    = typeof parsed.reply   === "string" ? parsed.reply   : raw.trim();
    const emotion = typeof parsed.emotion === "string" ? parsed.emotion : null;
    const { reply: _r, emotion: _e, ...rest } = parsed;
    const action = "action" in rest ? rest : null;
    console.log("[xiaoyu] parsed:", { text: text.slice(0, 60), action, emotion });
    return { text, action, emotion };
  } catch {
    console.error("[xiaoyu] JSON parse failed, raw:", cleaned.slice(0, 120));
    return { text: raw.trim(), action: null, emotion: null };
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const body = await req.json() as { messages: ChatMessage[]; context?: AppContext };
  const { messages, context = {} } = body;

  const systemPrompt = buildSystemPrompt(context);

  // Gemini 用 "user" / "model"（不是 "assistant"），system 单独传
  const geminiContents = messages.slice(-30).map((m, i, arr) => {
    const role = m.role === "assistant" ? "model" : "user";
    let content = m.content;
    if (i === arr.length - 1 && m.role === "user") {
      content += "\n[注意：只输出一个 JSON 对象，不要加任何其他文字或代码块]";
    }
    return { role, parts: [{ text: content }] };
  });

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 300,
    },
  };

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      }
    );

    const data = await res.json() as {
      candidates?: { content: { parts: { text: string }[] } }[];
      error?: { message: string };
    };

    if (!res.ok || data.error) {
      const msg = data.error?.message ?? `HTTP ${res.status}`;
      console.error("[xiaoyu] Gemini error:", msg);
      return NextResponse.json({ error: `小鱿出了点问题... (${msg})`, emotion: "sleepy" }, { status: 502 });
    }

    const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawReply) {
      return NextResponse.json({ error: "……", emotion: "thinking" }, { status: 502 });
    }

    console.log("[xiaoyu] raw:", rawReply.slice(0, 200));
    const { text, action, emotion } = parseResponse(rawReply);
    return NextResponse.json({ reply: text, action, emotion });

  } catch (err) {
    console.error("[xiaoyu] fetch error:", err);
    return NextResponse.json({ error: "网络出问题了 🥲", emotion: "sad" }, { status: 503 });
  }
}
