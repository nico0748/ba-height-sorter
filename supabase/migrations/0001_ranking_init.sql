-- ============================================================
-- キヴォトス・ラインアップ！ オンラインランキング 初期スキーマ
-- 方針:
--   * scores は誰でも閲覧可（公開SELECT）。書き込みは Edge Function（service role）経由のみ。
--   * game_sessions / submission_log は anon からは一切アクセス不可（RLS有効・ポリシー無し）。
--     service role は RLS をバイパスするため Edge Function からのみ読み書きできる。
-- ============================================================

-- gen_random_uuid() 用
create extension if not exists "pgcrypto";

-- ── スコア（公開リーダーボード） ───────────────────────────
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  mode        text not null check (mode in ('sort','group')),
  diff        text not null check (diff in ('easy','normal','hard','extreme','insane')),
  q_count     int  not null check (q_count in (1,5,10)),
  name        text not null check (char_length(name) between 1 and 16),
  time_ms     int  not null check (time_ms between 1000 and 3600000),
  created_at  timestamptz not null default now()
);

-- リーダーボード取得用（カテゴリ → タイム昇順）
create index if not exists scores_leaderboard_idx
  on public.scores (mode, diff, q_count, time_ms asc, created_at asc);

alter table public.scores enable row level security;

-- 公開SELECTのみ許可（INSERT/UPDATE/DELETE ポリシーは作らない＝anonは書けない）
drop policy if exists "scores public read" on public.scores;
create policy "scores public read" on public.scores
  for select using (true);

-- ── ゲームセッション（サーバ発行トークン） ─────────────────
create table if not exists public.game_sessions (
  token       uuid primary key default gen_random_uuid(),
  mode        text not null,
  diff        text not null,
  q_count     int  not null,
  issued_at   timestamptz not null default now(),
  ip_hash     text,
  used        boolean not null default false
);

create index if not exists game_sessions_issued_idx
  on public.game_sessions (issued_at);

-- RLS 有効・ポリシー無し → anon/auth からは不可。service role のみ（Edge Function）。
alter table public.game_sessions enable row level security;

-- ── 送信ログ（IPレート制限用） ─────────────────────────────
create table if not exists public.submission_log (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);

create index if not exists submission_log_ip_time_idx
  on public.submission_log (ip_hash, created_at desc);

alter table public.submission_log enable row level security;

-- ── 後片付け用（任意・運用で定期実行）: 古いセッション/ログを掃除 ──
-- 例:  delete from public.game_sessions where issued_at < now() - interval '1 day';
--      delete from public.submission_log where created_at < now() - interval '1 day';
