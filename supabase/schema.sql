-- ============================================================
-- The Next Move — Supabase Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================================

-- ── 1. tasks ────────────────────────────────────────────────
create table if not exists tasks (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  type        text not null check (type in ('survive','creation','fun','heal')),
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table tasks enable row level security;
create policy "users manage own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. task_history ─────────────────────────────────────────
create table if not exists task_history (
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  survive     int not null default 0,
  creation    int not null default 0,
  fun         int not null default 0,
  heal        int not null default 0,
  pts         int not null default 0,
  primary key (user_id, date)
);
alter table task_history enable row level security;
create policy "users manage own history"
  on task_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 3. transactions ─────────────────────────────────────────
create table if not exists transactions (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  amount      numeric not null,
  date        text not null,
  image_url   text
);
alter table transactions enable row level security;
create policy "users manage own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. wishlist ─────────────────────────────────────────────
create table if not exists wishlist (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  cost        numeric not null,
  image_url   text,
  created_at  text not null
);
alter table wishlist enable row level security;
create policy "users manage own wishlist"
  on wishlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. ddls ─────────────────────────────────────────────────
create table if not exists ddls (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  date        date not null,
  time        text not null default '00:00',
  contact     text
);
alter table ddls enable row level security;
create policy "users manage own ddls"
  on ddls for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. notes ────────────────────────────────────────────────
create table if not exists notes (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null,
  category    text not null,
  created_at  text not null
);
alter table notes enable row level security;
create policy "users manage own notes"
  on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 7. bookmarks ────────────────────────────────────────────
create table if not exists bookmarks (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  url         text not null,
  emoji       text,
  created_at  text not null
);
alter table bookmarks enable row level security;
create policy "users manage own bookmarks"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 8. pending_applications (账号申请，无需登录即可提交) ────
create table if not exists pending_applications (
  id                uuid primary key default gen_random_uuid(),
  email             text not null,
  desired_password  text not null,
  note              text,
  created_at        timestamptz not null default now()
);
alter table pending_applications enable row level security;
-- 任何人可以 INSERT（提交申请）
create policy "anyone can apply"
  on pending_applications for insert
  with check (true);
-- 只有 service_role 可以 SELECT / DELETE（通过 Admin API Route 操作）
