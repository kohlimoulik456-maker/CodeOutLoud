create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_pro boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  overall_score integer not null check (overall_score between 0 and 100),
  communication_score integer not null check (communication_score between 0 and 100),
  avg_wpm integer not null default 0 check (avg_wpm >= 0),
  avg_dead_air_percentage numeric(5, 2) not null default 0
    check (avg_dead_air_percentage between 0 and 100),
  total_filler_words integer not null default 0 check (total_filler_words >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.attempted_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  question_id text not null,
  question_title text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  hints_used integer not null default 0 check (hints_used between 0 and 3),
  test_cases_passed boolean not null default false,
  transcript_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_created_idx
  on public.interview_sessions (user_id, created_at desc);
create index if not exists attempted_questions_session_idx
  on public.attempted_questions (session_id);

alter table public.users enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.attempted_questions enable row level security;

revoke all on public.users, public.interview_sessions, public.attempted_questions
  from anon, authenticated;
grant select on public.users to authenticated;
grant select, insert on public.interview_sessions to authenticated;
grant select, insert on public.attempted_questions to authenticated;

drop policy if exists "Users can read their own profile" on public.users;
create policy "Users can read their own profile"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can access their own sessions" on public.interview_sessions;
create policy "Users can access their own sessions"
  on public.interview_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own sessions" on public.interview_sessions;
create policy "Users can create their own sessions"
  on public.interview_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can access questions from their own sessions" on public.attempted_questions;
create policy "Users can access questions from their own sessions"
  on public.attempted_questions for select to authenticated
  using (
    exists (
      select 1
      from public.interview_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can create questions for their own sessions" on public.attempted_questions;
create policy "Users can create questions for their own sessions"
  on public.attempted_questions for insert to authenticated
  with check (
    exists (
      select 1
      from public.interview_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.create_user_profile();

create or replace function public.save_interview_session(
  p_overall_score integer,
  p_communication_score integer,
  p_avg_dead_air_percentage numeric,
  p_total_filler_words integer,
  p_question_id text,
  p_question_title text,
  p_difficulty text,
  p_hints_used integer,
  p_test_cases_passed boolean,
  p_transcript_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.interview_sessions (
    user_id,
    overall_score,
    communication_score,
    avg_dead_air_percentage,
    total_filler_words
  )
  values (
    v_user_id,
    p_overall_score,
    p_communication_score,
    p_avg_dead_air_percentage,
    p_total_filler_words
  )
  returning id into v_session_id;

  insert into public.attempted_questions (
    session_id,
    question_id,
    question_title,
    difficulty,
    hints_used,
    test_cases_passed,
    transcript_data
  )
  values (
    v_session_id,
    p_question_id,
    p_question_title,
    p_difficulty,
    p_hints_used,
    p_test_cases_passed,
    coalesce(p_transcript_data, '{}'::jsonb)
  );

  return v_session_id;
end;
$$;

revoke all on function public.save_interview_session(
  integer, integer, numeric, integer, text, text, text, integer, boolean, jsonb
) from public, anon;
grant execute on function public.save_interview_session(
  integer, integer, numeric, integer, text, text, text, integer, boolean, jsonb
) to authenticated;
