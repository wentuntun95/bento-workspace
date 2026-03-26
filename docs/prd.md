# The Next Move — 产品需求文档 (PRD v3)

> **更新时间**: 2026-03-26
> **状态**: 全功能已上线，开源准备中

---

## 一、产品定位

一个能将注意力转化为执行力再转化为货币的陪伴型个人能量管理系统。核心理念：**Focus = Currency**。

- **不是**又一个任务列表。是「四色能量 → 像素果实 → 积分货币 → 实物奖励」的正向闭环。
- **视觉语言**：马卡龙治愈系（Pastel）+ 极大圆角 + 暖奶白背景 + 点阵纹理。
- **竞品差异**：11 个精心编排的组件形成有机整体，每个组件有严格的语义化主色调。
- **License**：CC BY-NC 4.0（非商用开源）

---

## 二、核心闭环

```
每日任务（四色卡）
    ↓ 完成 +10pts/个，每日归档，次日清空
能量树（Energy Tree）
    ↓ 展示本周果实（Hybrid B），周一清零
积分账本（Points）
    ↓ 月度可用积分 = 本月归档积分 - 本月消费
愿望兑换（Wishlist + Ledger）
    ↓ 月积分 >= 心愿成本 → 开宝箱动效 → 扣除积分
```

---

## 三、组件清单（全部已实现）

| 组件 | 说明 | 备注 |
|------|------|------|
| **Survive / Creation / Fun / Heal** | 四色任务卡 | 打勾高亮 + +10pts 飞字；每5个触发彩带；每日归档；含 InfoTip 引导 |
| **Energy Tree** | 2D像素风能量树 | Canvas 动画；50槽位果实；Hybrid B（本周历史+今日实时）；周一清零 |
| **Calendar** | 30天滚动日历 | 纵向7行手账风；DDL 拖入四色卡；30分钟前小鱿提醒 |
| **Note** | 便签卡 | 分类筛选+关键词搜索；固定弹窗；保留换行 |
| **Image** | 图片贴纸卡 | 单槽位+历史图库（最多20张）；portal 浮动模式 |
| **Music** | 音乐播放器 | 液态玻璃风；默认3首+本地上传；自动切歌 |
| **Weather** | 天气卡 | Open-Meteo；7种插画风格自动切换 |
| **Webside** | 快捷书签 | portal 浮层表单；favicon 自动获取 |
| **Ledger** | 积分账本 | 图文方格；永久保留历史；删除旧记录不影响本月积分；含 InfoTip |
| **Wishlist** | 愿望清单 | 积分进度条；达标金色 pulse；ChestBurst Canvas 开宝箱；含 InfoTip |
| **小鱿 AI 助手** | 桌面宠物+对话助手 | 可拖动；MiniMax M2-7 / 可替换 API；12种情绪表情；30条上下文缓存 |
| **能量周报** | 成就弹窗 | 底部滑出（移动端）/ 右侧推入（桌面）；年度总积分+每周明细 |

---

## 四、积分系统（定稿 v2）

> 详见 `docs/points-system.md`

### 关键设计决策

- `transactions[]` 统一存储 Ledger 手动记账 + Wishlist 兑换（替代原 `redemptions` 计划）
- 积分**只能用本月的**，历史月份不可追溯消费
- 删除 Ledger 旧记录**不影响**本月可用积分
- `weeklyEarned` / `monthlyEarned` 为纯任务积分（不扣支出），专供能量树显示

### 能量树果实（Hybrid B）

```
allFruits = buildWeeklyFruits(taskHistory, tasks)
  = 本周 taskHistory 展开（历史锁定）
  + 今日 tasks.completed 实时追加
```

### 彩带里程碑

today 完成的第 5 / 10 / 15… 个任务触发彩带，每天独立计数。

---

## 五、技术架构

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 App Router + React + Tailwind CSS |
| 状态 | Zustand + persist（localStorage + Supabase 云同步） |
| 拖拽 | dnd-kit（SmartPointerSensor 防误触） |
| 动画 | Canvas 2D（能量树 / ChestBurst / 彩带） |
| 数据 | Supabase（PostgreSQL + Auth + RLS） |
| 部署 | Vercel（一键 + 环境变量配置） |
| AI | MiniMax M2-7（可替换任意兼容 API，BFF 代理） |

### 数据库表（8张）

`tasks` / `task_history` / `transactions` / `wishlist` / `ddls` / `notes` / `bookmarks` / `pending_applications`

建表脚本：`supabase/schema.sql`

---

## 六、鉴权与账号

| 场景 | 流程 |
|------|------|
| 匿名使用 | localStorage only，全功能，数据不持久化 |
| 登录账号 | Email + Password，session 60天自动续期 |
| 申请账号 | 填邮件 + 期望密码 → 管理员审批 → 立即可用 |
| 改密码 | 需输入当前密码验证，再更新新密码 |

**账号创建方式（两种）**：
- 方案 A：Supabase Dashboard → Authentication → Add user（推荐小白）
- 方案 B：POST `/api/admin/approve`（需 `ADMIN_TOKEN` header）

---

## 七、视觉规范

- **背景**：`oklch(97% 0.01 70)` 暖奶白 + 微点阵纹理（opacity 0.04）
- **圆角**：卡片 `rounded-3xl`，按钮 `rounded-lg` / `rounded-full`
- **字体**：Caveat（标题装饰）+ Inter（内容）
- **InfoTip**：💡 灯泡图标，portal 定位气泡，颜色跟随卡片主色调

---

## 八、小鱿 AI 助手

```
用户 → 点击小鱿 → 聊天面板
     → 语音（Web Speech API）或文字
     → POST /api/xiaoyu [BFF 代理]
     → AI API（默认 MiniMax，可替换）
     → 返回 { reply, action?, emotion }
     → 执行操作 + 切换小鱿表情
```

**支持操作**：添加任务 / 记账 / 添加愿望 / 添加 DDL / 查询回复

**表情包**：来源 [diyCutie](https://github.com/Diudiu-wl/diyCutie)，12种情绪，可自行替换

**注意**：手机端语音对话暂不可用，桌面端正常。

---

## 九、开发路线图

### ✅ Phase 1 — 基础界面
所有组件可用，基础积分运行中。

### ✅ Phase 2 — 积分系统重构
taskHistory / transactions / 每日归档 / 周期重置 / 能量周报 / InfoTip 引导。

### ✅ Phase 3 — 数据持久化 + 鉴权
Supabase 8张表 + RLS；Email 登录；Admin 审批；密码安全改密。

### ✅ Phase 4 — PWA + 移动端
manifest.ts；底部 Tab 导航；各卡片移动端适配；Vercel 部署。

### 🔲 Phase 5 — 待开发

| 功能 | 说明 |
|------|------|
| 桌面端拖拽重排 | Bento Grid 自由排列（欢迎社区 PR） |
| 小鱿手机端语音 | Web Speech API 移动端兼容 |
| 能量树季节变色 | 春/夏/秋/冬四季主题 |
| 小鱿情绪识别 | 根据任务完成率触发情绪变化 |
