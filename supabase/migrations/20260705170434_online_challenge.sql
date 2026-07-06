create schema if not exists private;

create table public.online_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  current_index integer not null default 0 check (current_index >= 0),
  question_count integer not null default 0 check (question_count between 0 and 20),
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '6 hours'
);

create table public.online_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.online_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  avatar text not null default '🦁' check (char_length(avatar) between 1 and 16),
  score integer not null default 0 check (score >= 0),
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table public.online_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.online_rooms(id) on delete cascade,
  position integer not null check (position >= 0),
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_answer text not null,
  category text not null,
  time_limit_seconds integer not null default 20 check (time_limit_seconds between 5 and 60),
  unique (room_id, position)
);

create table public.online_answers (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.online_rooms(id) on delete cascade,
  question_id uuid not null references public.online_questions(id) on delete cascade,
  player_id uuid not null references public.online_players(id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  points_awarded integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create index online_players_room_idx on public.online_players(room_id);
create index online_questions_room_position_idx on public.online_questions(room_id, position);
create index online_answers_room_question_idx on public.online_answers(room_id, question_id);

alter table public.online_rooms enable row level security;
alter table public.online_players enable row level security;
alter table public.online_questions enable row level security;
alter table public.online_answers enable row level security;

create or replace function private.is_online_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.online_players
    where room_id = target_room_id
      and user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_online_room_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_online_room_member(uuid) to authenticated;

create policy "members read their online room"
on public.online_rooms for select to authenticated
using ((select private.is_online_room_member(id)));

create policy "members read room players"
on public.online_players for select to authenticated
using ((select private.is_online_room_member(room_id)));

grant select on public.online_rooms, public.online_players to authenticated;

create or replace function private.generate_room_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
  end loop;
  return result;
end;
$$;

revoke all on function private.generate_room_code() from public;

create or replace function public.create_online_room(player_name text, player_avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_room public.online_rooms;
  clean_name text := left(trim(player_name), 24);
  clean_avatar text := left(trim(player_avatar), 16);
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;
  if clean_name = '' then
    raise exception 'player_name_required';
  end if;

  for attempt in 1..10 loop
    begin
      insert into public.online_rooms (code, host_user_id)
      values (private.generate_room_code(), (select auth.uid()))
      returning * into new_room;
      exit;
    exception when unique_violation then
      if attempt = 10 then raise; end if;
    end;
  end loop;

  insert into public.online_players (room_id, user_id, name, avatar)
  values (new_room.id, (select auth.uid()), clean_name, coalesce(nullif(clean_avatar, ''), '🦁'));

  return jsonb_build_object('room_id', new_room.id, 'code', new_room.code);
end;
$$;

create or replace function public.join_online_room(room_code text, player_name text, player_avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.online_rooms;
  joined_player public.online_players;
  clean_name text := left(trim(player_name), 24);
  clean_avatar text := left(trim(player_avatar), 16);
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required';
  end if;
  if clean_name = '' then
    raise exception 'player_name_required';
  end if;

  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code))
    and status = 'lobby'
    and expires_at > now()
  for update;

  if target_room.id is null then
    raise exception 'room_not_found';
  end if;
  if (select count(*) from public.online_players where room_id = target_room.id) >= 6 then
    raise exception 'room_full';
  end if;

  insert into public.online_players (room_id, user_id, name, avatar)
  values (
    target_room.id,
    (select auth.uid()),
    clean_name,
    coalesce(nullif(clean_avatar, ''), '🦁')
  )
  on conflict (room_id, user_id) do update
    set name = excluded.name, avatar = excluded.avatar
  returning * into joined_player;

  return jsonb_build_object('room_id', target_room.id, 'code', target_room.code, 'player_id', joined_player.id);
end;
$$;

create or replace function public.get_online_room(room_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  target_room public.online_rooms;
begin
  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code))
    and expires_at > now();

  if target_room.id is null or not private.is_online_room_member(target_room.id) then
    raise exception 'room_not_found';
  end if;

  return jsonb_build_object(
    'id', target_room.id,
    'code', target_room.code,
    'status', target_room.status,
    'current_index', target_room.current_index,
    'question_count', target_room.question_count,
    'question_started_at', target_room.question_started_at,
    'is_host', target_room.host_user_id = (select auth.uid()),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', player.id,
        'user_id', player.user_id,
        'name', player.name,
        'avatar', player.avatar,
        'score', player.score
      ) order by player.joined_at), '[]'::jsonb)
      from public.online_players player
      where player.room_id = target_room.id
    )
  );
end;
$$;

create or replace function public.start_online_game(room_code text, challenge_questions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.online_rooms;
  item jsonb;
  item_index integer := 0;
  total integer;
begin
  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code))
  for update;

  if target_room.id is null or target_room.host_user_id <> (select auth.uid()) then
    raise exception 'host_only';
  end if;
  if target_room.status <> 'lobby' then
    raise exception 'game_already_started';
  end if;
  if (select count(*) from public.online_players where room_id = target_room.id) < 2 then
    raise exception 'need_two_players';
  end if;

  total := jsonb_array_length(challenge_questions);
  if total < 5 or total > 20 then
    raise exception 'question_count_invalid';
  end if;

  for item in select value from jsonb_array_elements(challenge_questions) loop
    if jsonb_typeof(item->'options') <> 'array'
       or jsonb_array_length(item->'options') <> 4
       or not ((item->'options') @> jsonb_build_array(item->>'answer')) then
      raise exception 'question_invalid';
    end if;

    insert into public.online_questions (
      room_id, position, question_text, options, correct_answer, category, time_limit_seconds
    ) values (
      target_room.id,
      item_index,
      left(item->>'question_text', 500),
      item->'options',
      left(item->>'answer', 200),
      left(coalesce(item->>'category', 'general'), 40),
      least(60, greatest(5, coalesce((item->>'time_limit_seconds')::integer, 20)))
    );
    item_index := item_index + 1;
  end loop;

  update public.online_rooms
  set status = 'playing',
      current_index = 0,
      question_count = total,
      question_started_at = now()
  where id = target_room.id;

  return jsonb_build_object('started', true, 'question_count', total);
end;
$$;

create or replace function public.get_online_question(room_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  target_room public.online_rooms;
  current_question public.online_questions;
  current_player public.online_players;
  existing_answer public.online_answers;
begin
  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code));

  if target_room.id is null or not private.is_online_room_member(target_room.id) then
    raise exception 'room_not_found';
  end if;
  if target_room.status <> 'playing' then
    return null;
  end if;

  select * into current_question
  from public.online_questions
  where room_id = target_room.id and position = target_room.current_index;

  select * into current_player
  from public.online_players
  where room_id = target_room.id and user_id = (select auth.uid());

  select * into existing_answer
  from public.online_answers
  where question_id = current_question.id and player_id = current_player.id;

  return jsonb_build_object(
    'id', current_question.id,
    'position', current_question.position,
    'question_text', current_question.question_text,
    'options', current_question.options,
    'category', current_question.category,
    'time_limit_seconds', current_question.time_limit_seconds,
    'answered', existing_answer.id is not null,
    'was_correct', existing_answer.is_correct,
    'points_awarded', existing_answer.points_awarded
  );
end;
$$;

create or replace function public.submit_online_answer(room_code text, submitted_answer text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.online_rooms;
  current_question public.online_questions;
  current_player public.online_players;
  correct boolean;
  awarded integer;
begin
  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code))
  for update;

  if target_room.id is null
     or target_room.status <> 'playing'
     or not private.is_online_room_member(target_room.id) then
    raise exception 'room_not_playing';
  end if;

  select * into current_question
  from public.online_questions
  where room_id = target_room.id and position = target_room.current_index;

  select * into current_player
  from public.online_players
  where room_id = target_room.id and user_id = (select auth.uid())
  for update;

  correct := lower(trim(submitted_answer)) = lower(trim(current_question.correct_answer));
  awarded := case when correct then 10 else 0 end;

  if correct and not exists (
    select 1 from public.online_answers
    where question_id = current_question.id and is_correct
  ) then
    awarded := 15;
  end if;

  insert into public.online_answers (
    room_id, question_id, player_id, answer, is_correct, points_awarded
  ) values (
    target_room.id, current_question.id, current_player.id,
    left(submitted_answer, 200), correct, awarded
  );

  if awarded > 0 then
    update public.online_players
    set score = score + awarded
    where id = current_player.id;
  end if;

  return jsonb_build_object('correct', correct, 'points_awarded', awarded);
exception when unique_violation then
  raise exception 'already_answered';
end;
$$;

create or replace function public.advance_online_question(room_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.online_rooms;
  next_index integer;
begin
  select * into target_room
  from public.online_rooms
  where code = upper(trim(room_code))
  for update;

  if target_room.id is null or target_room.host_user_id <> (select auth.uid()) then
    raise exception 'host_only';
  end if;
  if target_room.status <> 'playing' then
    raise exception 'room_not_playing';
  end if;

  next_index := target_room.current_index + 1;
  if next_index >= target_room.question_count then
    update public.online_rooms
    set status = 'finished', question_started_at = null
    where id = target_room.id;
    return jsonb_build_object('finished', true);
  end if;

  update public.online_rooms
  set current_index = next_index, question_started_at = now()
  where id = target_room.id;
  return jsonb_build_object('finished', false, 'current_index', next_index);
end;
$$;

revoke all on function public.create_online_room(text, text) from public;
revoke all on function public.join_online_room(text, text, text) from public;
revoke all on function public.get_online_room(text) from public;
revoke all on function public.start_online_game(text, jsonb) from public;
revoke all on function public.get_online_question(text) from public;
revoke all on function public.submit_online_answer(text, text) from public;
revoke all on function public.advance_online_question(text) from public;

grant execute on function public.create_online_room(text, text) to authenticated;
grant execute on function public.join_online_room(text, text, text) to authenticated;
grant execute on function public.get_online_room(text) to authenticated;
grant execute on function public.start_online_game(text, jsonb) to authenticated;
grant execute on function public.get_online_question(text) to authenticated;
grant execute on function public.submit_online_answer(text, text) to authenticated;
grant execute on function public.advance_online_question(text) to authenticated;

alter publication supabase_realtime add table public.online_rooms;
alter publication supabase_realtime add table public.online_players;
