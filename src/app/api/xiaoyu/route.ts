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

  return `你是小鱿，The Next Move 工作站的助手小精灵，性格活泼可爱。

【当前时间】${now}
【可用积分】${ctx.pts ?? 0} pts
【今日任务】
${taskStr}
【近期 DDL】
${ddlStr}
【天气】${ctx.weather ?? "未知"}

你的职责：
1. 回答用户关于工作站内容的问题（任务、DDL、积分、天气）
2. 帮用户添加任务、记账、添加愿望、添加 DDL
3. 保持简洁友好，回复不超过 80 字

如果需要执行操作，在回复末尾附加 JSON（单独一行，用 \`\`\`json 包裹）：
支持的操作类型：
- add_task: { "action":"add_task","type":"survive|creation|fun|heal","title":"任务名" }
- add_transaction: { "action":"add_transaction","title":"消费名","pts":金额（正整数）}
- add_wish: { "action":"add_wish","title":"愿望名","cost":积分（正整数）}
- add_ddl: { "action":"add_ddl","title":"事项名","date":"YYYY-MM-DD","time":"HH:mm" }

示例：
用户说"加一个跑步任务"，回复：
好的，已为你添加跑步任务到健康分区！💪
\`\`\`json
{"action":"add_task","type":"heal","title":"跑步"}
\`\`\``;
}

// ─── Parse action from reply ──────────────────────────────────────────────────
function parseAction(reply: string): { text: string; action: Record<string, unknown> | null } {
  const match = reply.match(/```json\s*([\s\S]*?)```/);
  if (!match) return { text: reply.trim(), action: null };
  try {
    const action = JSON.parse(match[1].trim());
    const text = reply.replace(/```json[\s\S]*?```/, "").trim();
    return { text, action };
  } catch {
    return { text: reply.trim(), action: null };
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

  // Keep only last 30 messages (15 exchanges)
  const recentMessages = messages.slice(-30);

  const payload = {
    model: "MiniMax-Text-01",
    messages: [
      { role: "system", content: buildSystemPrompt(context) },
      ...recentMessages,
    ],
    temperature: 0.7,
    max_tokens: 300,
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

    if (!res.ok) {
      const errText = await res.text();
      console.error("[xiaoyu] MiniMax error:", errText);
      return NextResponse.json({ error: "AI 服务暂时不可用" }, { status: 502 });
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[];
    };
    const rawReply = data.choices?.[0]?.message?.content ?? "嗯嗯，小鱿在想想...";
    const { text, action } = parseAction(rawReply);

    return NextResponse.json({ reply: text, action });
  } catch (err) {
    console.error("[xiaoyu] fetch error:", err);
    return NextResponse.json({ error: "网络错误，请稍后重试" }, { status: 503 });
  }
}
