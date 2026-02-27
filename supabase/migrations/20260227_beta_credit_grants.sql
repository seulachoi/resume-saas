-- One-time beta credit grant guard

create table if not exists public.beta_credit_grants (
  user_id uuid primary key,
  granted_credits integer not null check (granted_credits > 0),
  source text not null default 'beta_unlock_v1',
  granted_at timestamptz not null default now()
);

create or replace function public.grant_beta_credits_once(
  p_user_id uuid,
  p_amount integer,
  p_source text default 'beta_unlock_v1'
)
returns table(granted boolean, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  current_balance integer := 0;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'p_amount must be > 0';
  end if;

  insert into public.beta_credit_grants(user_id, granted_credits, source)
  values (p_user_id, p_amount, coalesce(nullif(p_source, ''), 'beta_unlock_v1'))
  on conflict (user_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    perform public.add_credits(p_user_id, p_amount);
    granted := true;
  else
    granted := false;
  end if;

  select coalesce(uc.balance, 0) into current_balance
  from public.user_credits uc
  where uc.user_id = p_user_id;

  balance := coalesce(current_balance, 0);
  return next;
end;
$$;

