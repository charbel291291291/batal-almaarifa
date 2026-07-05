-- بطل المعرفة — مخطط قاعدة البيانات (PostgreSQL / Supabase)
-- الإصدار المستهدف: v2.0 (الأونلاين). الـ MVP المحلي لا يحتاج قاعدة بيانات.

-- ============ المستخدمون ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar text not null default '🦁',
  locale text not null default 'ar',
  created_at timestamptz not null default now()
);

-- ============ حزم الأسئلة ============
create table question_packs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid references profiles(id) on delete set null,
  is_public boolean not null default false,
  is_premium boolean not null default false,
  price_cents integer,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid references question_packs(id) on delete cascade,
  type text not null check (type in ('direct','mcq','boolean','complete','clues','audio','image')),
  question_text text not null,
  answer text not null,
  accepted_answers text[] not null default '{}',
  wrong_answers text[] not null default '{}',
  category text not null,
  difficulty text not null check (difficulty in ('easy','medium','hard','expert')),
  explanation text,
  source_note text,
  media_url text,                      -- للأسئلة الصوتية/المصوّرة
  time_limit_seconds integer not null default 15,
  points integer not null default 10,
  language text not null default 'ar',
  tags text[] not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  review_status text not null default 'pending'
    check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index questions_category_difficulty_idx on questions (category, difficulty)
  where review_status = 'approved';

-- ============ الغرف والجلسات ============
create table game_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- 6 محارف غير متسلسلة
  host_id uuid not null references profiles(id),
  mode text not null check (mode in ('party','host','online','creator')),
  settings jsonb not null,             -- GameSettings كاملة
  status text not null default 'lobby'
    check (status in ('lobby','playing','finished','abandoned')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

create table room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  guest_name text,                     -- لاعبون بلا حساب
  avatar text not null default '🦁',
  is_ready boolean not null default false,
  is_eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, profile_id)
);

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game_rooms(id) on delete cascade,
  winner_player_id uuid references room_players(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table round_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  round_id text not null,              -- r1..r5
  round_index integer not null,
  state jsonb not null,                -- لقطة Phase للاستئناف
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ============ اللعب اللحظي ============
create table buzzer_events (
  id bigint generated always as identity primary key,
  round_session_id uuid not null references round_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  player_id uuid not null references room_players(id),
  server_ts timestamptz not null default now(),  -- ختم الخادم هو الحَكم
  accepted boolean not null default false        -- أول جرس فقط
);
create index buzzer_events_order_idx on buzzer_events (round_session_id, question_id, server_ts);

create table answer_submissions (
  id bigint generated always as identity primary key,
  round_session_id uuid not null references round_sessions(id) on delete cascade,
  question_id uuid not null references questions(id),
  player_id uuid not null references room_players(id),
  raw_answer text not null,
  normalized_answer text not null,
  is_correct boolean,
  validated_by text check (validated_by in ('auto','host')),
  elapsed_ms integer,
  created_at timestamptz not null default now(),
  unique (round_session_id, question_id, player_id)  -- منع تكرار الإجابة
);

create table score_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references game_sessions(id) on delete cascade,
  player_id uuid not null references room_players(id),
  round_id text not null,
  question_id uuid references questions(id),
  old_score integer not null,
  score_delta integer not null,
  new_score integer not null,
  reason text not null,                -- correct | speed_bonus | wrong_penalty | chain_banked | chain_completed | steal | host_adjust
  created_at timestamptz not null default now()
);
create index score_events_session_idx on score_events (session_id, created_at);

-- ============ الإحصاءات والجودة ============
create table player_stats (
  profile_id uuid primary key references profiles(id) on delete cascade,
  games_played integer not null default 0,
  games_won integer not null default 0,
  total_correct integer not null default 0,
  total_wrong integer not null default 0,
  best_streak integer not null default 0,
  fastest_answer_ms integer,
  updated_at timestamptz not null default now()
);

create table question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  reporter_id uuid references profiles(id) on delete set null,
  reason text not null,                -- wrong_answer | typo | outdated | inappropriate | other
  note text,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- ============ RLS (أمثلة أساسية) ============
alter table profiles enable row level security;
alter table question_packs enable row level security;
alter table questions enable row level security;
alter table game_rooms enable row level security;
alter table room_players enable row level security;
alter table game_sessions enable row level security;
alter table round_sessions enable row level security;
alter table buzzer_events enable row level security;
alter table answer_submissions enable row level security;
alter table score_events enable row level security;
alter table player_stats enable row level security;
alter table question_reports enable row level security;

create policy "read approved questions" on questions
  for select using (review_status = 'approved' or created_by = auth.uid());
create policy "own profile" on profiles
  for all using (id = auth.uid());
create policy "read public question packs" on question_packs
  for select using (is_public or owner_id = auth.uid());
create policy "manage own question packs" on question_packs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "create question reports" on question_reports
  for insert with check (reporter_id = auth.uid());
-- ملاحظة: الإجابة الصحيحة تُقدَّم عبر دالة/عرض خادمي فقط أثناء اللعب،
-- ولا يُسمح للعميل بقراءة عمودي answer/accepted_answers في غرفة نشطة.
-- بقية جداول اللعب بلا سياسات عميل عمداً: الوصول إليها يكون عبر دوال
-- SECURITY DEFINER مدققة أو خدمة الخادم فقط، وسياسة RLS الافتراضية تمنع الوصول المباشر.

-- ============ أحداث Realtime (قنوات Supabase) ============
-- room:{code} → player_joined, player_ready, game_started,
--               round_started, question_started, buzz_pressed,
--               answer_submitted, answer_validated, score_updated,
--               question_revealed, round_ended, player_eliminated, game_finished
