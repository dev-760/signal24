-- Run this in your Supabase SQL Editor to set up the Signal24 database

-- 1. Create Users Table
CREATE TABLE public.users (
    username text PRIMARY KEY,
    display_name text NOT NULL,
    password_hash text NOT NULL,
    balance integer NOT NULL DEFAULT 100,
    is_admin boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Create Messages Table
CREATE TABLE public.messages (
    id bigserial PRIMARY KEY,
    type text NOT NULL,
    username text,
    text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. Create Bets State Table (Tracks open/resolved categories)
CREATE TABLE public.bets_state (
    bet_id text PRIMARY KEY,
    status text NOT NULL DEFAULT 'open',
    winner integer NULL,
    category text NOT NULL,
    label text NOT NULL,
    icon text,
    choices jsonb NOT NULL
);

-- 4. Create Bet Ledger Table (Tracks who bet what)
CREATE TABLE public.bet_ledger (
    id bigserial PRIMARY KEY,
    bet_id text NOT NULL,
    username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE,
    choice_index integer NOT NULL,
    amount integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Disable Row Level Security (RLS) so the completely open Node.js backend can manage it
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_ledger DISABLE ROW LEVEL SECURITY;
