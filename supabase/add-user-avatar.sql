-- Add an optional Google profile image URL to application member profiles.
alter table public."User"
  add column if not exists avatar_url text;
