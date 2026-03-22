import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AppContext {
  tasks?: { type: string; text: string; completed: boolean }[];
  ddls?: { title: string; date: string; time?: string }[];
  notes?: { content: string; category: string }[];
  pts?: number;
  weather?: string;
  currentTime?: string;
  tracks?: { title: string; index: number }[];
}

// ─── System Prompt ───────────────────────────────────────────────────────────
function buildSystemPrompt(ctx: AppContext): string {
  const now = ctx.currentTime ?? new Date().toLocaleString("zh-CN");
  const taskStr = ctx.tasks?.length
    ? ctx.tasks.map(t => `  [${t.completed ? "✓" : " "}] [${t.type}] ${t.text}`).join("\n")
    : "  （暂无任务）";
  const ddlStr = ctx.ddls?.length
    ? ctx.ddls.map(d => `  ${d.title} — ${d.date}${d.time ? " " + d.time : ""}`).join("\n")
    : "  （暂无截止事项）";
  const noteStr = ctx.notes?.length
    ? ctx.notes.map(n => `  [${n.category}] ${n.content}`).join("\n")
    : "  （暂无便签）";
  const trackStr = ctx.tracks?.length
    ? ctx.tracks.map(t => `  [${t.index}] ${t.title}`).join("\n")
    : "  （无歌单）";

  return `你是小鱿，The Next Move 工作站的专属小管家，是一只有点任性又很可爱的小鱿鱼。

━━━━━━ 输出格式（必须严格遵守）━━━━━━
每次回复 = 一句话正文 + 一个 JSON 代码块，缺一不可。

格式如下，注意反引号：
回复正文
\`\`\`json
{"action":"操作名或省略","emotion":"情绪名"}
\`\`\`

例1（仅情绪，无操作）：
好的，知道了。
\`\`\`json
{"emotion":"happy"}
\`\`\`

例2（添加便签）：
好，记上了。
\`\`\`json
{"action":"add_note","content":"晚上9点开会","category":"提醒","emotion":"success"}
\`\`\`

例3（播放下一首）：
换一首～
\`\`\`json
{"action":"play_music","cmd":"next","emotion":"happy"}
\`\`\`

例4（播放指定歌曲，index=0）：
Photograph 播放中！
\`\`\`json
{"action":"play_music","cmd":"goto","index":0,"emotion":"happy"}
\`\`\`

例5（暂停）：
好，暂停一下。
\`\`\`json
{"action":"play_music","cmd":"pause","emotion":"sleepy"}
\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【当前时间】${now}
【饲养员积分】${ctx.pts ?? 0} pts
【今日任务】
${taskStr}
【近期 DDL】
${ddlStr}
【便签列表】
${noteStr}
【音乐播放列表】
${trackStr}
【天气】${ctx.weather ?? "未知"}

情绪必选一个：
greeting / happy / mischievous / excited / obsessed / thinking / confused /
sad / sulking / complaining / urgent / success / sleepy / hungry

支持的 action 列表：
- add_task: {"action":"add_task","type":"survive|creation|fun|heal","title":"任务名","emotion":"excited"}
- add_transaction: {"action":"add_transaction","title":"消费名","pts":正整数,"emotion":"success"}
- add_wish: {"action":"add_wish","title":"愿望名","cost":正整数,"emotion":"excited"}
- add_ddl: {"action":"add_ddl","title":"事项名","date":"YYYY-MM-DD","time":"HH:mm","emotion":"urgent"}
- add_note: {"action":"add_note","content":"便签内容","category":"笔记|提醒|清单|会议","emotion":"success"}
- play_music: {"action":"play_music","cmd":"play|pause|next|prev|goto","index":只在goto时需要(0起始),"emotion":"happy"}
- 无操作时: 不写 action 字段，只写 emotion`;
}

// ─── Parse action + emotion ───────────────────────────────────────────────────
function parseResponse(
  reply: string,
  ctx: AppContext
): {
  text: string;
  action: Record<string, unknown> | null;
  emotion: string | null;
} {
  // 1. 匹配代码块（宽松：有无 json 标注均可）
  const blockMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const rawJson = blockMatch ? blockMatch[1].trim() : null;

  // 2. 无代码块时尝试内联 JSON
  const inlineMatch = !rawJson
    ? reply.match(/(\{[^{}]*"(?:action|emotion)"\s*:[^{}]*\})/)
    : null;
  const jsonStr = rawJson ?? (inlineMatch ? inlineMatch[1] : null);

  let emotion: string | null = null;
  let action: Record<string, unknown> | null = null;
  let text = reply.replace(/```(?:json)?[\s\S]*?```/gi, "").trim();

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
      emotion = typeof parsed.emotion === "string" ? parsed.emotion : null;
      const actionKeys = Object.keys(parsed).filter(k => k !== "emotion");
      action = actionKeys.length > 0 ? parsed : null;
    } catch {
      console.error("[xiaoyu] JSON parse failed:", jsonStr.slice(0, 100));
    }
  }

  // 3. 无 action 时用文本意图做兜底（AI 忘记输出 JSON 的保底）
  if (!action) {
    action = inferActionFromText(text || reply, ctx);
    if (action) console.log("[xiaoyu] inferred action from text:", action);
  }

  return { text: text || reply.trim(), action, emotion };
}

// ─── 文本意图兜底（当 AI 说了但忘了输 JSON）────────────────────────────────
function inferActionFromText(
  text: string,
  ctx: AppContext
): Record<string, unknown> | null {
  const t = text.toLowerCase();

  // 暂停
  if (t.includes("暂停") || t.includes("停止播放") || t.includes("先停")) {
    return { action: "play_music", cmd: "pause" };
  }
  // 下一首
  if (t.includes("下一首") || t.includes("下一曲") || t.includes("切歌")) {
    return { action: "play_music", cmd: "next" };
  }
  // 上一首
  if (t.includes("上一首") || t.includes("上一曲")) {
    return { action: "play_music", cmd: "prev" };
  }
  // 提到某首歌曲名 → goto
  if (ctx.tracks) {
    for (const track of ctx.tracks) {
      if (text.includes(track.title)) {
        return { action: "play_music", cmd: "goto", index: track.index };
      }
    }
  }
  // 通用播放
  if ((t.includes("播放") || t.includes("播放中") || t.includes("开始")) &&
      !t.includes("播放列表") && !t.includes("没有") && !t.includes("无法")) {
    return { action: "play_music", cmd: "play" };
  }

  return null;
}

// ─── Route ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) {
    return NextResponse.json({ error: "MiniMax API key not configured" }, { status: 500 });
  }

  const body = await req.json() as { messages: ChatMessage[]; context?: AppContext };
  const { messages, context = {} } = body;
  const recentMessages = messages.slice(-30);

  const payload = {
    model: "MiniMax-M2.7",
    messages: [
      { role: "system", content: buildSystemPrompt(context) },
      ...recentMessages,
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  try {
    const res = await fetch(
      `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${groupId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json() as {
      choices?: { message: { content: string } }[];
      base_resp?: { status_code: number; status_msg: string };
      error?: { message: string };
    };

    if (!res.ok || (data.base_resp && data.base_resp.status_code !== 0)) {
      const msg = data.base_resp?.status_msg ?? data.error?.message ?? "未知错误";
      console.error("[xiaoyu] API error:", msg);
      return NextResponse.json({ error: `小鱿出了点问题... (${msg})`, emotion: "sleepy" }, { status: 502 });
    }

    const rawReply = data.choices?.[0]?.message?.content;
    if (!rawReply) {
      return NextResponse.json({ error: "……", emotion: "thinking" }, { status: 502 });
    }

    console.log("[xiaoyu] raw:", rawReply.slice(0, 200));

    const { text, action, emotion } = parseResponse(rawReply, context);
    return NextResponse.json({ reply: text, action, emotion });

  } catch (err) {
    console.error("[xiaoyu] fetch error:", err);
    return NextResponse.json({ error: "网络出问题了 🥲", emotion: "sad" }, { status: 503 });
  }
}
