/**
 * 积分派生计算函数（纯函数，不存储）
 * transactions[] 即为全部消费流水，amount 始终为负数
 */

export interface TaskHistoryEntry {
  date: string;       // "YYYY-MM-DD"
  survive: number;
  creation: number;
  fun: number;
  heal: number;
  pts: number;        // 当日总积分，归档时锁定
}

export interface Transaction {
  id: string;
  title: string;
  amount: number;    // 负数，消费积分
  date: string;      // ISO 时间字符串
  imageUrl?: string;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function getYearMonth(iso: string) {
  return iso.slice(0, 7); // "YYYY-MM"
}

/** 获取 ISO 周号字符串，格式 "YYYY-WW" */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, "0")}`;
}

function getISOWeekFromStr(dateStr: string) {
  return getISOWeek(new Date(dateStr));
}

function currentYearMonth() {
  return getYearMonth(new Date().toISOString());
}

function currentISOWeek() {
  return getISOWeek(new Date());
}

// ── 派生计算 ──────────────────────────────────────────────────────────────────

/** 历史总积分 + 今日未归档 */
export function totalPoints(
  taskHistory: TaskHistoryEntry[],
  currentTasks?: { completed: boolean }[]
): number {
  const archived = taskHistory.reduce((sum, e) => sum + e.pts, 0);
  const today    = (currentTasks ?? []).filter(t => t.completed).length * 10;
  return archived + today;
}

/** 本月已消费积分 */
export function monthlyExchanged(transactions: Transaction[]): number {
  const month = currentYearMonth();
  return transactions
    .filter(t => getYearMonth(t.date) === month)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/** 本月可用积分 = 本月任务积分 + 今日未归档 - 本月消费 */
export function monthlyPoints(
  taskHistory: TaskHistoryEntry[],
  transactions: Transaction[],
  currentTasks?: { completed: boolean }[]
): number {
  const month = currentYearMonth();
  const earned = taskHistory
    .filter(e => getYearMonth(e.date) === month)
    .reduce((sum, e) => sum + e.pts, 0);
  const todayEarned = (currentTasks ?? []).filter(t => t.completed).length * 10;
  const spent = transactions
    .filter(t => getYearMonth(t.date) === month)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return Math.max(0, earned + todayEarned - spent);
}

/** 本周可用积分 = 本周任务积分 + 今日未归档 - 本周消费 */
export function weeklyPoints(
  taskHistory: TaskHistoryEntry[],
  transactions: Transaction[],
  currentTasks?: { completed: boolean }[]
): number {
  const week = currentISOWeek();
  const earned = taskHistory
    .filter(e => getISOWeekFromStr(e.date) === week)
    .reduce((sum, e) => sum + e.pts, 0);
  const todayEarned = (currentTasks ?? []).filter(t => t.completed).length * 10;
  const spent = transactions
    .filter(t => getISOWeekFromStr(t.date) === week)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  return Math.max(0, earned + todayEarned - spent);
}

/** 本周已消费积分 */
export function weeklyExchanged(transactions: Transaction[]): number {
  const week = currentISOWeek();
  return transactions
    .filter(t => getISOWeekFromStr(t.date) === week)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
}

/** 按 ISO 周聚合 taskHistory（用于能量周报） */
export interface WeeklyReport {
  week: string;       // "YYYY-WW"
  pts: number;        // 本周任务积分
  spent: number;      // 本周消费
  survive: number;
  creation: number;
  fun: number;
  heal: number;
}

export function weeklyReports(
  taskHistory: TaskHistoryEntry[],
  transactions: Transaction[],
  currentTasks?: { completed: boolean; type: string }[]
): WeeklyReport[] {
  const map = new Map<string, WeeklyReport>();

  for (const e of taskHistory) {
    const week = getISOWeekFromStr(e.date);
    const existing = map.get(week) ?? { week, pts: 0, spent: 0, survive: 0, creation: 0, fun: 0, heal: 0 };
    map.set(week, {
      ...existing,
      pts:      existing.pts      + e.pts,
      survive:  existing.survive  + e.survive,
      creation: existing.creation + e.creation,
      fun:      existing.fun      + e.fun,
      heal:     existing.heal     + e.heal,
    });
  }

  for (const t of transactions) {
    const week = getISOWeekFromStr(t.date);
    const existing = map.get(week);
    if (existing) {
      map.set(week, { ...existing, spent: existing.spent + Math.abs(t.amount) });
    }
  }

  // 实时合并今日未归档任务
  if (currentTasks) {
    const completed = currentTasks.filter(t => t.completed);
    if (completed.length > 0) {
      const todayWeek = currentISOWeek();
      const existing = map.get(todayWeek) ?? { week: todayWeek, pts: 0, spent: 0, survive: 0, creation: 0, fun: 0, heal: 0 };
      const byType = { survive: 0, creation: 0, fun: 0, heal: 0 };
      for (const t of completed) {
        const k = t.type as keyof typeof byType;
        if (k in byType) byType[k]++;
      }
      map.set(todayWeek, {
        ...existing,
        pts:      existing.pts      + completed.length * 10,
        survive:  existing.survive  + byType.survive,
        creation: existing.creation + byType.creation,
        fun:      existing.fun      + byType.fun,
        heal:     existing.heal     + byType.heal,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.week.localeCompare(a.week));
}

/** 今天的日期字符串 "YYYY-MM-DD" */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 当前 ISO 周 */
export { currentISOWeek };
