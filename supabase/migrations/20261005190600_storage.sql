-- HistóricoDrive — 0006 storage privado (bucket anexos)
-- Nunca public: anexo nunca cruza a rede (docs/adr/0001).
-- Caminho: {locadora_id}/rascunho/{arquivo} e {locadora_id}/{incidente_id}/{arquivo}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- helper usada pelas policies (as policies rodam como authenticated, que nao
-- le as tabelas de negocio; entao o caminho passa por uma funcao definer)
create or replace function e_minha_pasta(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfil_locadora pl
     where pl.perfil_id = auth.uid()
       and p_caminho like pl.locadora_id::text || '/%'
  );
$$;

drop policy if exists anexo_leitura on storage.objects;
create policy anexo_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and e_minha_pasta(name));

drop policy if exists anexo_carga on storage.objects;
create policy anexo_carga on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and e_minha_pasta(name));

drop policy if exists anexo_remocao on storage.objects;
create policy anexo_remocao on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and e_minha_pasta(name));
