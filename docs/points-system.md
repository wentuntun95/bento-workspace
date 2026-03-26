# 积分系统设计文档（定稿 v2）

## Store 字段

```ts
// 时间戳（重置检测）
lastDailyReset:  string;   // "YYYY-MM-DD"
lastWeeklyReset: string;   // "YYYY-WW"（ISO 周号）

// 任务历史（每日归档，不可变）
taskHistory: {
  date:     string;   // "YYYY-MM-DD"
  survive:  number;   // 当日完成数
  creation: number;
  fun:      number;
  heal:     number;
  pts:      number;   // 当日总积分（归档时锁定）
}[];

// 消费流水（手动录入 + Wishlist 兑换自动写入，amount 为负数）
transactions: {
  id:       string;
  title:    string;
  amount:   number;   // 负数，消费积分
  date:     string;   // ISO 时间字符串
  imageUrl?: string;
}[];

// 当日实时任务（每日重置清空）
tasks: Task[];   // Task.createdAt: string
```

## 派生计算（实时，不存储）

> 所有字段**实时跟随当天任务勾选状态更新**，不等归档。

```
任务分值：所有类型统一 10 pts/个

todayEarned       = tasks.filter(completed).length * 10
                  = 今日已完成任务积分（实时）

totalPoints       = sum(taskHistory[].pts) + todayEarned

monthlyPoints     = sum(taskHistory 中本月的 pts) + todayEarned
                  - sum(transactions 中本月的 |amount|)

weeklyPoints      = sum(taskHistory 中本周的 pts) + todayEarned
                  - sum(transactions 中本周的 |amount|)

monthlyExchanged  = sum(transactions 中本月的 |amount|)
weeklyExchanged   = sum(transactions 中本周的 |amount|)

── 不含支出的纯任务积分（能量树专用，2025-03 新增）──

weeklyEarned      = sum(taskHistory 中本周的 pts) + todayEarned
monthlyEarned     = sum(taskHistory 中本月的 pts) + todayEarned
totalEarned       = sum(taskHistory[].pts) + todayEarned
```

实现位置：`src/lib/points.ts`，各函数接收 `currentTasks?: Task[]` 作为可选参数。

## Ledger 与 Wishlist 的关系

- **Ledger（积分账本）**：手动录入支出记录，写入 `transactions[]`，扣减积分
- **Wishlist（愿望清单）**：攒积分兑换大件，兑换成功后自动写入 `transactions[]`并显示在 Ledger 中（title 格式为 `[兑换] xxx`）
- `transactions[]` 是两者共用的消费流水，`monthlyExchanged` = 本月全部流水总和

## 每日重置逻辑（app 启动时检查）

```
checkAndResetDaily():
  if lastDailyReset == today → 跳过
  else:
    将 tasks.filter(completed) 归档到 taskHistory
    清空 tasks（未完成也丢弃）
    lastDailyReset = today

checkAndResetWeekly():
  lastWeeklyReset = currentISOWeek()
  （能量树自动读新周的 taskHistory）
```

## 兑换逻辑

```
用户兑换心愿 →
  检查 monthlyPoints >= wish.cost（在组件层，用实时值）
  ✅ 足够 → 写入 transactions[]（amount = -wish.cost），删除 wishlist 条目
  ❌ 不足 → 不触发（按钮 disabled 或提示）
```

## 各组件显示

| 组件 | 显示内容 | 字段 |
|------|---------|-----|
| 顶部 Header | 本月可用积分 | monthlyPoints |
| 能量树 HUD | 本周累计 / 本月累计（不计支出） | weeklyEarned / monthlyEarned |
| 愿望清单右上角 | 本月可用积分 | monthlyPoints |
| 积分账本右上角 | 本月已兑换 | monthlyExchanged |
| 能量周报（弹窗）| 总积分 + 每周明细 | totalPoints + weeklyReports() |

## 能量周报格式（弹窗）

```
2026年  总积分 XXX 分

第20周  本周剩余积分 XXX 分
  蓝色任务 XX 个，绿色 XX 个，粉色 XX 个，紫色 XX 个

第19周  ...
```

## 能量树果实（Hybrid B，2026-03 更新）

果实来源 = **本周 taskHistory 展开** + **今日 tasks.completed 实时叠加**

```
buildWeeklyFruits(taskHistory, tasks):
  historic = taskHistory 中 ISO 周号 == 当前周的所有条目
             → 按 survive/creation/fun/heal 数量展开为虚拟果实列表
  today    = tasks.filter(completed) 实时追加
  return   [...historic, ...today].slice(-50)  // 最多 50 个果实槽
```

- 今天勾任务 → 实时增加果实；取消勾选 → 实时减少
- 周一之前的历史果实锁定，不随任务变动
- 周一 ISO 周号更新后，历史部分自动切换到新一周（清零）
- 超出 50 个果实时，多余不显示

## 彩带里程碑

```
triggerConfettiIfMilestone(newCompletedCount):
  if newCompletedCount % 5 === 0 → 触发彩带动画
```

- 基准：**今日**已完成任务总数（不跨天累计）
- 触发时机：第 5、10、15… 个任务完成时
- 实现：`src/components/confetti-manager.tsx`
