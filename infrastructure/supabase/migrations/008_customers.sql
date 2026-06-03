-- Create customers table for storing address book of clients
create table if not exists public.customers (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    birth_date text not null,
    birth_time text,
    birth_place text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.customers enable row level security;

-- Create Policies
create policy "Users can view their own customers"
    on public.customers for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own customers"
    on public.customers for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own customers"
    on public.customers for update
    using ( auth.uid() = user_id );

create policy "Users can delete their own customers"
    on public.customers for delete
    using ( auth.uid() = user_id );

-- Add a trigger to update 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_customers_updated_at
  before update on public.customers
  for each row
  execute function public.handle_updated_at();
