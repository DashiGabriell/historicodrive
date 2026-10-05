-- HistóricoDrive — 0007 hardening (ADR 0003)
-- Nenhuma leitura/escrita direta de tabela pelo PostgREST. Tudo via RPC.

-- 1. RLS ligado em toda tabela de negocio
do $$
declare
  t record;
begin
  for t in
    select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace
       and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    -- cuidado: NAO usar "force row level security" aqui. O dono da tabela
    -- (postgres) e o que executa as RPCs SECURITY DEFINER; forcar RLS quebraria
    -- todas elas. authenticated/anonymous ficam fora da tabela pelo revoke 2.
  end loop;
end;
$$;

-- 2. privilegios de tabela removidos de quem fala com o PostgREST
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

-- 3. EXECUTE: o public do Postgres concede por padrao; tiramos e devolvemos
--    apenas na superficie publica de RPCs.
revoke execute on all functions in schema public from public, anon;

grant execute on function
  solicitar_cadastro(text, text, text, text, text, text),
  meu_perfil(),
  definir_locadora_ativa(uuid),
  listar_pendentes(),
  decidir_locadora(uuid, text, text),
  atualizar_minha_locadora(text, text, text, text),
  definir_receber_da_rede(boolean),
  criar_ou_localizar_motorista(text, text, date),
  buscar_motorista(text),
  abrir_ficha(uuid, text),
  criar_incidente(uuid, text, tipo_incidente, text, numeric, confianca_incidente, jsonb),
  listar_incidentes(int),
  mudar_estado_incidente(uuid, estado_incidente, text, confianca_incidente),
  painel_kpis(date, date),
  listar_auditoria(int, int),
  e_minha_pasta(text)
to authenticated, service_role;
