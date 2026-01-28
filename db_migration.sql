-- Run this in your Supabase SQL Editor to support Clinical Charting (Odontogram)

create table if not exists public.tooth_records (
    id uuid default gen_random_uuid() primary key,
    patient_id uuid references public.patients(id) on delete cascade,
    tooth_id text not null,
    status text,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.tooth_records enable row level security;

-- Create policy (Adjust as needed for your specific tenant security)
create policy "Allow all access to tooth_records" on public.tooth_records
    for all using (true) with check (true);

-- Fix patients RLS policy to allow public access
drop policy if exists "Allow authenticated write" on public.patients;
drop policy if exists "Allow public read" on public.patients;

create policy "Allow all access to patients" on public.patients
    for all using (true) with check (true);
