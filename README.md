# The Next Move 🌱

> 一款专为 ADHD 友好设计的个人能量工作站 PWA

**生产地址（私人访问）**：内测中

---

## ✨ 功能概览

| 模块 | 描述 |
|------|------|
| **四色任务板** | Survive / Creation / Fun / Heal 四维度任务管理，完成得积分 |
| **周历日程** | DDL 可拖拽到任务栏，30 分钟前小鱿自动提醒 |
| **能量树** | 像素风 2D 树，随积分成长 |
| **便签** | 多分类便签，支持编辑/复制/搜索，按日期分组 |
| **音乐播放器** | 内置 BGM 列表，支持 AI 语音切歌 |
| **天气卡** | 实时城市天气（Open-Meteo + 百度地图） |
| **许愿账本** | 积分兑换心愿系统，wishing pool 插画背景 |
| **小鱿 AI** | MiniMax M2-7 驱动的桌面宠物助手，可添加任务/日程/便签/心愿 |
| **手机端 PWA** | 3-Tab 底部导航（工作区 / 休闲区 / 积分兑换），可安装到桌面 |

---

## 🛠 技术栈

- **框架**：Next.js 16 (App Router, Turbopack)
- **样式**：Tailwind CSS + Vanilla CSS 自定义
- **状态**：Zustand（本地持久化 + Supabase 云同步）
- **后端**：Supabase（Auth + Postgres）
- **AI**：MiniMax M2-7 Chat API（Server-side）
- **拖拽**：@dnd-kit/core
- **字体**：Inter + Caveat（Google Fonts）

---

## 🚀 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制示例并填写：

```bash
cp .env.example .env.local
```

`.env.local` 需要以下变量：

```env
# Supabase（公开可见，设计上安全）
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# MiniMax（仅 server-side，切勿加 NEXT_PUBLIC_ 前缀）
MINIMAX_API_KEY=xxx
MINIMAX_GROUP_ID=xxx
```

### 3. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:3000
```

---

## 📦 生产构建

```bash
npm run build
npm start
```

推荐使用 **Vercel** 一键部署，环境变量在 Vercel Dashboard 配置即可。

---

## 🔒 安全说明

- `.env*` 已加入 `.gitignore`，不会上传 GitHub
- `MINIMAX_API_KEY` 仅在 `src/app/api/xiaoyu/route.ts`（Server-side API Route）中使用
- Supabase `ANON KEY` 是公开可见的只读密钥（通过 RLS 策略保护数据）
- 无 `SERVICE_ROLE_KEY` 在客户端暴露

---

## 📱 PWA 安装

在手机浏览器打开后：
- iOS Safari：分享 → 添加到主屏幕
- Android Chrome：菜单 → 安装应用

---

## 📁 目录结构

```
src/
├── app/
│   ├── api/xiaoyu/     # 小鱿 AI API Route（Server-side）
│   ├── globals.css
│   └── page.tsx        # 主入口，桌面/手机布局分支
├── components/
│   ├── cards/          # 各功能卡片组件
│   ├── bento-grid.tsx  # 桌面端布局
│   ├── mobile-bento-grid.tsx  # 手机端 3-Tab 布局
│   └── xiao-you-reminder.tsx # 小鱿宠物 + 聊天面板
├── hooks/
│   └── useMobile.ts    # 响应式断点 Hook
└── lib/
    ├── store.ts        # Zustand 状态管理
    ├── points.ts       # 积分计算逻辑
    └── auth-context.tsx # Supabase Auth 上下文
```

---

## 🗺 路线图

- [x] 四色任务系统 + 积分体系
- [x] 周历日程 + DDL 拖拽
- [x] 小鱿 AI 助手（MiniMax）
- [x] PWA 手机端布局
- [x] 许愿账本
- [ ] Supabase 数据持久化（多设备同步）
- [ ] 更多小鱿技能（情绪识别、数据洞察）
- [ ] 图片贴纸模块（手机端）

---

*Made with 🧡 for ADHD brains*
