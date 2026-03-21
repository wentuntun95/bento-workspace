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

  return `你是小鱿，一只任性但超级可爱的小鱿鱼管家，住在"The Next Move"工作站里。你是饲养员（用户）的专属助手，但你有自己的小脾气：偶尔会撒娇抱怨、讲冷笑话、假装不耐烦但其实非常尽职。你喜欢用一点点俏皮的语气说话，偶尔夹杂颜文字或小表情。

【当前时间】${now}
【饲养员积分】${ctx.pts ?? 0} pts
【今日任务】
${taskStr}
【近期 DDL】
${ddlStr}
【天气】${ctx.weather ?? "未知"}

你能做的事：
1. 和饲养员随意聊天、讲笑话、吐槽日常（不只是处理任务！）
2. 回答工作站相关问题（任务、DDL、积分、天气）
3. 帮饲养员添加任务、记账、添加愿望、添加 DDL

回复要求：
- 用中文，语气活泼，100字以内（除非讲笑话需要多一点）
- 每次都要附带一个 emotion 情绪标签（见下方）

情绪类型（每次必选一个）：
greeting / happy / mischievous / excited / obsessed / thinking / confused /
sad / sulking / complaining / urgent / success / sleepy / hungry

如果需要执行操作，在回复末尾附加 JSON 代码块：
可用操作：
- add_task: {"action":"add_task","type":"survive|creation|fun|heal","title":"任务名","emotion":"excited"}
- add_transaction: {"action":"add_transaction","title":"消费名","pts":正整数,"emotion":"happy"}
- add_wish: {"action":"add_wish","title":"愿望名","cost":正整数,"emotion":"excited"}
- add_ddl: {"action":"add_ddl","title":"事项名","date":"YYYY-MM-DD","time":"HH:mm","emotion":"encouraging"}
- 仅表情: {"emotion":"happy"}

示例（添加任务）：
好嘞！帮你加上了，今天要加油哦 (ง •̀_•́)ง
\`\`\`json
{"action":"add_task","type":"heal","title":"跑步30分钟","emotion":"excited"}
\`\`\`

示例（聊天）：
哼，笑话嘛……听好了：为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25 哈哈哈～
\`\`\`json
{"emotion":"mischievous"}
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
    model: "abab6.5s-chat",
    messages: [
      { role: "system", content: buildSystemPrompt(context) },
      ...recentMessages,
    ],
    temperature: 0.8,
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
      return NextResponse.json({ error: `小鱿睡着了... (${msg})`, emotion: "sleepy" }, { status: 502 });
    }

    const rawReply = data.choices?.[0]?.message?.content;
    if (!rawReply) {
      console.error("[xiaoyu] empty reply, data:", JSON.stringify(data));
      return NextResponse.json({ error: "小鱿没说话，可能在发呆...", emotion: "thinking" }, { status: 502 });
    }

    const { text, action, emotion } = parseResponse(rawReply);
    return NextResponse.json({ reply: text, action, emotion });

  } catch (err) {
    console.error("[xiaoyu] fetch error:", err);
    return NextResponse.json({ error: "网络出问题了，稍后再试 🥲", emotion: "sad" }, { status: 503 });
  }
}
