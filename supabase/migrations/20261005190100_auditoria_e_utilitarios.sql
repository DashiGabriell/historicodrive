-- HistóricoDrive — 0002 auditoria e funcoes utilitarias

create table audit_log (
  id bigint generated always as identity primary key,
  locadora_id uuid not null references locadora (id),
  ator uuid not null,
  acao text not null,
  alvo_tipo text not null,
  alvo_id uuid not null,
  antes jsonb,
  depois jsonb,
  criado_em timestamptz not null default now()
);

create index audit_log_locadora_em_idx on audit_log (locadora_id, criado_em desc);
create index audit_log_alvo_idx on audit_log (alvo_tipo, alvo_id);

-- append-only: ninguem atualiza nem apaga, nem quem e dono da tabela
create or replace function audit_log_bloquear_mutacao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log e append-only: % nao permitido', tg_op;
end;
$$;

create trigger audit_log_sem_mutacao
  before update or delete on audit_log
  for each row execute function audit_log_bloquear_mutacao();

-- mascara o CPF mantendo meio.456.789-** (docs/adr/0002)
create or replace function mascara_cpf(p_cpf text)
returns text
language sql
immutable
as $$
  select case
    when p_cpf is null or p_cpf !~ '^[0-9]{11}$' then '***'
    else '***.' || substring(p_cpf from 4 for 3)
      || '.' || substring(p_cpf from 7 for 3) || '-**'
  end;
$$;

-- locadora ativa do usuario logado (nunca vem do cliente - ADR 0003)
create or replace function minha_locadora()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select locadora_ativa from perfil where id = auth.uid();
$$;

create or replace function meu_papel()
returns papel_perfil
language sql
stable
security definer
set search_path = public
as $$
  select papel from perfil where id = auth.uid();
$$;

-- exigencia comum a toda RPC de negocio
create or replace function exigir_autenticado()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;
  if not exists (select 1 from perfil where id = auth.uid()) then
    raise exception 'perfil nao encontrado';
  end if;
end;
$$;

create or replace function exigir_dono()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_autenticado();
  if meu_papel() <> 'dono' then
    raise exception 'acesso negado: papel dono exigido';
  end if;
  if minha_locadora() is null then
    raise exception 'nenhuma locadora ativa';
  end if;
end;
$$;

create or replace function exigir_superadmin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_autenticado();
  if meu_papel() <> 'superadmin' then
    raise exception 'acesso negado: papel superadmin exigido';
  end if;
end;
$$;

create or replace function registrar_auditoria(
  p_locadora_id uuid,
  p_acao text,
  p_alvo_tipo text,
  p_alvo_id uuid,
  p_antes jsonb default null,
  p_depois jsonb default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into audit_log (locadora_id, ator, acao, alvo_tipo, alvo_id, antes, depois)
  values (p_locadora_id, coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
          p_acao, p_alvo_tipo, p_alvo_id, p_antes, p_depois);
$$;

-- regra de visibilidade da rede (docs/adr/0001): proprio registro, ou
-- confirmado+alta quando a locadora ouve a rede.
create or replace function incidente_visivel_para(
  p_incidente_locadora uuid,
  p_incidente_estado estado_incidente,
  p_incidente_confianca confianca_incidente,
  p_minha_locadora uuid,
  p_minha_rede boolean
)
returns boolean
language sql
immutable
as $$
  select p_incidente_locadora = p_minha_locadora
    or (p_minha_rede
        and p_incidente_estado = 'confirmado'
        and p_incidente_confianca = 'alta');
$$;
