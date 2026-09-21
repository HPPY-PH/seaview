-- Enable realtime updates for member status and presence changes.
alter publication supabase_realtime add table public."User";
