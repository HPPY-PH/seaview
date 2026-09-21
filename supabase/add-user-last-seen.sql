-- Track recent member activity separately from account access status.
alter table public."User"
  add column if not exists last_seen_at timestamptz;
