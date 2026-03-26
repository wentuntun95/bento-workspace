# The Next Move 🌱

> 一款专为 ADHD 友好设计的个人能量管理工作站 · ADHD-Friendly Personal Energy Workstation

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

**Demo（内测中）**：[workspace.202291.top](https://workspace.202291.top)

---

## ✨ 功能概览

| 模块 | 描述 |
|------|------|
| **四色任务板** | Survive / Creation / Fun / Heal 四维度任务管理，每天更新，完成得积分 |
| **像素能量树** | Canvas 程序化生成，果实按周累计，周一清零重新生长 |
| **周历日程** | DDL 可拖拽到任务栏，小鱿 30 分钟前自动提醒 |
| **便签** | 多分类便签，支持编辑 / 搜索 / 按日期分组 |
| **许愿账本** | 积分兑换心愿系统，可按季节替换插画 |
| **天气卡** | 实时城市天气（Open-Meteo + 百度地图） |
| **音乐播放器** | 内置 BGM + 支持上传自定义曲目 |
| **小鱿 AI 助手** | 可对话的桌面宠物，支持添加任务 / 日程 / 便签 |
| **手机端 PWA** | 3-Tab 底部导航，可安装到桌面 |

---

## 🚀 一键部署（推荐）

### Step 1：Fork 仓库

点击右上角 **Fork** 按钮，将仓库 fork 到你的 GitHub 账号。

### Step 2：创建 Supabase 项目

1. 注册 [Supabase](https://supabase.com)（免费 tier 够用）
2. 创建新项目，记录以下两个值（Settings → API）：
   - `Project URL`
   - `anon public` key
3. 在 **SQL Editor** 中执行 [`supabase/schema.sql`](./supabase/schema.sql)，一键建表

### Step 3：部署到 Vercel

1. 登录 [Vercel](https://vercel.com)，点击 **Add New Project**
2. 选择你 fork 的仓库
3. 在 **Environment Variables** 中填入：

```env
NEXT_PUBLIC_SUPABASE_URL=    # 你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # 你的 anon public key
MINIMAX_API_KEY=             # MiniMax API Key（AI 对话功能，可选）
MINIMAX_GROUP_ID=            # MiniMax Group ID（AI 对话功能，可选）
```

4. 点击 **Deploy**，等待 1-2 分钟即可访问 🎉

---

## 👤 账号管理

部署完成后，有两种方式创建账号：

**方案 A（推荐小白）**：直接在 Supabase Dashboard → Authentication → Users → **Add user** 手动创建

**方案 B（带审批流程）**：启用内置的申请审批功能，额外配置：
```env
SUPABASE_SERVICE_ROLE_KEY=  # Supabase → Settings → API → service_role key
ADMIN_TOKEN=                # 自定义任意随机字符串（作为管理员密钥）
```
然后通过 `GET /api/admin/approve`（需在 Header 带 `x-admin-token`）查看和审批申请。

---

## 🎨 个性化定制

不需要编程能力：

| 定制项 | 操作方式 |
|--------|---------|
| 许愿池插图 | 替换 `/public/wishing-pool.png` |
| 背景音乐 | 替换 `/public/music/` 下的 mp3 |
| 小鱿表情包 | 修改 `xiao-you-reminder.tsx` 中的 emoji |

需要改配置（改代码常量）：

| 定制项 | 文件位置 |
|--------|---------|
| 任务分值（默认 10pt） | `src/lib/points.ts` |
| 彩带触发数（默认 5个） | `src/components/confetti-manager.tsx` |
| 任务类型名称 | `src/components/cards/task-card.tsx` THEME 对象 |

---

## 🛠 本地开发（想自己改造代码）

**方式一：Fork + Clone（推荐，可同步原仓库更新）**
```bash
# 1. GitHub 右上角点 Fork，把仓库复制到你的账号
# 2. 克隆到本地
git clone https://github.com/你的用户名/bento-workspace.git
cd bento-workspace/simulation-workstation
```

**方式二：直接下载 ZIP**
```
GitHub 仓库页面 → Code 按钮 → Download ZIP → 解压后用编辑器打开
```

```bash
npm install
cp .env.example .env.local   # 填写环境变量
npm run dev                  # 访问 http://localhost:3000
```

---

## 🗺 路线图

- [x] 四色任务系统 + 积分体系
- [x] 像素能量树（Canvas + 物理粒子）
- [x] 周历日程 + DDL 拖拽
- [x] 小鱿 AI 助手（可替换 API 厂商）
- [x] PWA 手机端布局
- [x] 许愿账本 + 积分兑换
- [x] Supabase 多设备云同步
- [ ] 桌面端 Bento Grid 拖拽重排（欢迎 PR）
- [ ] 小鱿手机端语音对话
- [ ] 更多小鱿技能（情绪识别、数据洞察）

---

## 📋 技术栈

- **框架**：Next.js 16 (App Router, Turbopack)
- **状态**：Zustand（本地持久化 + Supabase 云同步）
- **后端**：Supabase（Auth + Postgres + RLS）
- **AI**：MiniMax M2-7（可替换为任意兼容 API）
- **动画**：纯 Canvas（无第三方动画库）
- **字体**：Inter + Caveat（Google Fonts）

---

## 📄 开源声明

### License
本项目基于 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 开源，**仅限非商业用途**。

### Attribution
- **小鱿表情包**：来源于开源项目 [diyCutie](https://github.com/Diudiu-wl/diyCutie)，感谢原作者 ❤️
- **许愿池插画**：自制，可按季节自由替换
- **像素能量树**：原创 Canvas 算法实现

---

*Made with 🧡 for ADHD brains · "Wherever you go, you go forward."*
