-- Age for content filtering by age: nullable, set by the parent in NOE.
alter table public.children add column if not exists birth_date date;