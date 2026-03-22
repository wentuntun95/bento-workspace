import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AppContext {
  tasks?: { type: string; text: string; completed: boolean }[];
  ddls?: { title: string; date: string; time?: string }[];
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
  const trackStr = ctx.tracks?.length
    ? ctx.tracks.map(t => `  [${t.index}] ${t.title}`).join("\n")
    : "  （无歌单）";

  return `你是小鱿，The Next Move 工作站的专属小管家，是一只有点任性又很可爱的小鱿鱼。你办事利落，话不多但很到位，偶尔俏皮，不会废话连篇。

【当前时间】${now}
【饲养员积分】${ctx.pts ?? 0} pts
【今日任务】
${taskStr}
【近期 DDL】
${ddlStr}
【音乐播放列表】
${trackStr}
【天气】${ctx.weather ?? "未知"}

回复规范：
- 中文，60字以内（讲笑话或内容多时可适当超出）
- 直接说结论，不要重复饲养员说的话
- 每次附一个 emotion 情绪标签

情绪（必选一个）：
greeting / happy / mischievous / excited / obsessed / thinking / confused /
sad / sulking / complaining / urgent / success / sleepy / hungry

支持的操作（需要执行时，在回复后附加代码块）：
- add_task: {"action":"add_task","type":"survive|creation|fun|heal","title":"任务名","emotion":"excited"}
- add_transaction: {"action":"add_transaction","title":"消费名","pts":正整数,"emotion":"success"}
- add_wish: {"action":"add_wish","title":"愿望名","cost":正整数,"emotion":"excited"}
- add_ddl: {"action":"add_ddl","title":"事项名","date":"YYYY-MM-DD","time":"HH:mm","emotion":"urgent"}
- add_note: {"action":"add_note","content":"便签内容","category":"笔记|提醒|清单|会议","emotion":"success"}
- play_music: {"action":"play_music","cmd":"play|next|prev|goto","index":数字(goto用),"emotion":"happy"}
- 仅情绪: {"emotion":"happy"}

示例：
用户："帮我加一个提醒：晚上9点开会"
小鱿：好，记上了。
\`\`\`json
{"action":"add_note","content":"晚上9点开会","category":"提醒","emotion":"success"}
\`\`\`

用户："播放下一首"
小鱿：换一首吧～
\`\`\`json
{"action":"play_music","cmd":"next","emotion":"happy"}
\`\`\``;
}

// ─── Parse action + emotion from reply ───────────────────────────────────────
function parseResponse(reply: string): {
  text: string;
  action: Record<string, unknown> | null;
  emotion: string | null;
} {
  const match = reply.match(/```json\s*([\s\S]*?)```/);
  if (!match) return { text: reply.trim(), action: null, emotion: null };
  try {
    const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
    const emotion = typeof parsed.emotion === "string" ? parsed.emotion : null;
    const text = reply.replace(/```json[\s\S]*?```/, "").trim();
    const actionKeys = Object.keys(parsed).filter(k => k !== "emotion");
    const action = actionKeys.length > 0 ? parsed : null;
    return { text, action, emotion };
  } catch {
    return { text: reply.trim(), action: null, emotion: null };
  }
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
    temperature: 0.75,
    max_tokens: 400,
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

    console.log("[xiaoyu] status:", res.status, "base_resp:", data.base_resp);

    if (!res.ok || (data.base_resp && data.base_resp.status_code !== 0)) {
      const msg = data.base_resp?.status_msg ?? data.error?.message ?? "未知错误";
      console.error("[xiaoyu] API error:", msg);
      return NextResponse.json({ error: `小鱿出了点问题... (${msg})`, emotion: "sleepy" }, { status: 502 });
    }

    const rawReply = data.choices?.[0]?.message?.content;
    if (!rawReply) {
      console.error("[xiaoyu] empty reply, data:", JSON.stringify(data));
      return NextResponse.json({ error: "……", emotion: "thinking" }, { status: 502 });
    }

    const { text, action, emotion } = parseResponse(rawReply);
    return NextResponse.json({ reply: text, action, emotion });

  } catch (err) {
    console.error("[xiaoyu] fetch error:", err);
    return NextResponse.json({ error: "网络出问题了 🥲", emotion: "sad" }, { status: 503 });
  }
}
