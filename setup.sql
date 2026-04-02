-- =============================================
-- La Compra — Supabase Database Setup
-- Ejecuta esto en el SQL Editor de Supabase
-- =============================================

-- GROUPS
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now()
);

-- PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  group_id uuid references groups(id) on delete cascade,
  name text not null,
  quantity text not null default '1',
  created_at timestamptz default now()
);

-- CHECKED (items marked as bought)
create table if not exists checked (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- Indexes for performance
create index if not exists idx_groups_user on groups(user_id);
create index if not exists idx_products_user on products(user_id);
create index if not exists idx_products_group on products(group_id);
create index if not exists idx_checked_user on checked(user_id);

-- Enable Row Level Security (RLS) - allow all for publishable key
alter table groups enable row level security;
alter table products enable row level security;
alter table checked enable row level security;

-- Policies: allow all operations (since we use user_id as our auth)
create policy "allow all on groups" on groups for all using (true) with check (true);
create policy "allow all on products" on products for all using (true) with check (true);
create policy "allow all on checked" on checked for all using (true) with check (true);
