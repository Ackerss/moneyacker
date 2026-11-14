-- ==========================================
-- MONEYACKER - SUPABASE SQL SCHEMA
-- ==========================================
-- Como usar: Cole este script completo no "SQL Editor" do Supabase e clique em "Run".

-- 1. Criação da Tabela de Categorias
create table if not exists categories (
  id text primary key,
  name text not null,
  icon text not null,
  color text not null,
  type text not null, -- 'expense' ou 'income'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Criação da Tabela de Cartões de Crédito
create table if not exists cards (
  id text primary key,
  name text not null,
  limit_amount numeric not null,
  closing_day integer not null,
  due_day integer not null,
  color text not null,
  last_four_digits text,
  owner text default 'Jacson',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Criação da Tabela de Orçamentos
create table if not exists budgets (
  category_id text primary key references categories(id) on delete cascade,
  limit_amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Criação da Tabela de Transações
create table if not exists transactions (
  id text primary key,
  amount numeric not null,
  description text not null,
  date date not null,
  category text not null references categories(id) on delete cascade,
  type text not null, -- 'expense' ou 'income'
  payment_method text not null default 'cash', -- 'cash' ou o ID do cartão
  installment_id text,
  installment_number integer,
  total_installments integer,
  purchase_date date,
  status text not null default 'confirmed', -- 'confirmed' (confirmada) ou 'pending' (pendente via MacroDroid)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- POPULAR CATEGORIAS PADRÃO (Para o app não iniciar em branco)
-- ==========================================
insert into categories (id, name, icon, color, type) values
  ('cat-alimentacao', 'Alimentação', '🍔', '#f59e0b', 'expense'),
  ('cat-moradia', 'Moradia', '🏠', '#3b82f6', 'expense'),
  ('cat-transporte', 'Transporte', '🚗', '#10b981', 'expense'),
  ('cat-lazer', 'Lazer', '🎮', '#ec4899', 'expense'),
  ('cat-saude', 'Saúde', '❤️', '#ef4444', 'expense'),
  ('cat-educacao', 'Educação', '📚', '#8b5cf6', 'expense'),
  ('cat-pet', 'Pet', '🐶', '#06b6d4', 'expense'),
  ('cat-outros-desp', 'Outros (Despesas)', '💸', '#64748b', 'expense'),
  ('cat-salario', 'Salário', '💼', '#10b981', 'income'),
  ('cat-investimentos', 'Investimentos', '📈', '#3b82f6', 'income'),
  ('cat-outros-rec', 'Outros (Receitas)', '💰', '#f59e0b', 'income')
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  type = excluded.type;

-- ==========================================
-- HABILITAR REALTIME (Sincronização em tempo real)
-- ==========================================
begin;
  -- Remove as tabelas se já existirem na publicação (evita erros em execuções repetidas)
  alter publication supabase_realtime drop table if exists transactions;
  alter publication supabase_realtime drop table if exists categories;
  alter publication supabase_realtime drop table if exists budgets;
  alter publication supabase_realtime drop table if exists cards;
  
  -- Adiciona as tabelas ao Realtime
  alter publication supabase_realtime add table transactions;
  alter publication supabase_realtime add table categories;
  alter publication supabase_realtime add table budgets;
  alter publication supabase_realtime add table cards;
commit;

-- ==========================================
-- CONFIGURAR RLS (Row Level Security) PARA ACESSO ANÔNIMO
-- ==========================================
-- Como Jacson e Ana usarão uma chave anônima comum compartilhada, habilitamos
-- RLS com políticas que permitem leitura e escrita total para a role 'anon'.

alter table categories enable row level security;
alter table cards enable row level security;
alter table budgets enable row level security;
alter table transactions enable row level security;

-- Políticas para Categories
drop policy if exists "Acesso Total Anon - Categories" on categories;
create policy "Acesso Total Anon - Categories" on categories for all to anon using (true) with check (true);

-- Políticas para Cards
drop policy if exists "Acesso Total Anon - Cards" on cards;
create policy "Acesso Total Anon - Cards" on cards for all to anon using (true) with check (true);

-- Políticas para Budgets
drop policy if exists "Acesso Total Anon - Budgets" on budgets;
create policy "Acesso Total Anon - Budgets" on budgets for all to anon using (true) with check (true);

-- Políticas para Transactions
drop policy if exists "Acesso Total Anon - Transactions" on transactions;
create policy "Acesso Total Anon - Transactions" on transactions for all to anon using (true) with check (true);
