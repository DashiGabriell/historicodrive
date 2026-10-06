-- Histórico — 0009 schema de prova (T01 defesa legal)
-- contestacao, consulta_log, hash de anexo e aceite de termos.
-- Fonte: docs/adr/0004, docs/adr/0005, docs/spec-defesa-legal.md

create type estado_contestacao as enum ('aberta', 'procedente', 'improcedente');

-- 15 dias uteis a partir do instante informado (default: agora)
create or replace function adicionar_dias_uteis(p_de timestamptz, p_dias int)
returns timestamptz
language plpgsql
immutable
as $$
declare
  v_data timestamptz := p_de;
  v_restante int := greatest(coalesce(p_dias, 0), 0);
begin
  while v_restante > 0 loop
    v_data := v_data + interval '1 day';
    if extract(isodow from v_data) between 1 and 5 then
      v_restante := v_restante - 1;
    end if;
  end loop;
  return v_data;
end;
$$;

revoke execute on function adicionar_dias_uteis(timestamptz, int) from public, anon;

-- pedido do titular (motorista) — canal publico com verificacao de CPF (ADR 0004)
create table contestacao (
  id uuid primary key default gen_random_uuid(),
  incidente_id uuid not null references incidente (id),
  motorista_id uuid not null references motorista (id),
  locadora_dona uuid not null references locadora (id),
  nome_titular text not null check (length(btrim(nome_titular)) >= 5),
  email_titular text not null,
  descricao text not null check (length(btrim(descricao)) >= 20),
  aberto_em timestamptz not null default now(),
  prazo_locadora_em timestamptz not null default adicionar_dias_uteis(now(), 15),
  estado estado_contestacao not null default 'aberta',
  decido_por uuid,
  decidido_em timestamptz,
  motivo text,
  constraint contestacao_email_formato check (email_titular ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint contestacao_decisao check (
    estado = 'aberta'
    or (decido_por is not null and decidido_em is not null and motivo is not null)
  )
);

create index contestacao_incidente_idx on contestacao (incidente_id);
create index contestacao_locadora_estado_idx on contestacao (locadora_dona, estado, aberto_em desc);
create unique index contestacao_aberta_unico on contestacao (incidente_id) where estado = 'aberta';

-- prova de controle de acesso: quem abriu ficha/busca e quando (Q17=A)
create table consulta_log (
  id bigint generated always as identity primary key,
  perfil_id uuid not null,
  locadora_id uuid not null references locadora (id),
  motorista_id uuid not null references motorista (id),
  criado_em timestamptz not null default now()
);

create index consulta_log_motorista_em_idx on consulta_log (motorista_id, criado_em desc);
create index consulta_log_locadora_em_idx on consulta_log (locadora_id, criado_em desc);

-- append-only como audit_log
create or replace function consulta_log_bloquear_mutacao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'consulta_log e append-only: % nao permitido', tg_op;
end;
$$;

create trigger consulta_log_sem_mutacao
  before update or delete on consulta_log
  for each row execute function consulta_log_bloquear_mutacao();

create or replace function registrar_consulta(
  p_locadora_id uuid,
  p_motorista_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into consulta_log (perfil_id, locadora_id, motorista_id)
  values (
    coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    p_locadora_id,
    p_motorista_id
  );
$$;

revoke execute on function registrar_consulta(uuid, uuid) from public, anon;

-- integridade da prova da locadora (Q18=A)
alter table anexo add column hash text;

-- aceite dos termos da locadora (Q5/Q14) — colunas de conveniencia; prova no audit
alter table locadora
  add column termos_versao text,
  add column termos_aceite_em timestamptz,
  add column termos_aceite_por uuid;

-- RLS + privilegios das tabelas novas (hardening 0007 so cobria as da epoca)
alter table contestacao enable row level security;
alter table consulta_log enable row level security;
revoke all on contestacao from anon, authenticated;
revoke all on consulta_log from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- cria_incidente passa a aceitar/exigir hash sha256 em cada anexo
create or replace function criar_incidente(
  p_motorista_id uuid,
  p_placa text,
  p_tipo tipo_incidente,
  p_descricao text,
  p_valor numeric default null,
  p_confianca confianca_incidente default 'media',
  p_anexos jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_placa text := upper(regexp_replace(coalesce(p_placa, ''), '\s', '', 'g'));
  v_id uuid;
  v_qtd int;
  v_item jsonb;
  v_caminho text;
  v_hash text;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  if v_placa !~ '^[A-Z]{3}-?[0-9]{4}$' and v_placa !~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$' then
    raise exception 'placa invalida';
  end if;
  if length(btrim(p_descricao)) < 10 then
    raise exception 'descricao precisa de ao menos 10 caracteres';
  end if;
  if p_valor is not null and p_valor < 0 then
    raise exception 'valor invalido';
  end if;

  v_qtd := coalesce(jsonb_array_length(p_anexos), 0);
  if v_qtd < 1 then
    raise exception 'ao menos uma foto ou documento e obrigatoria';
  end if;
  if v_qtd > 6 then
    raise exception 'maximo de 6 anexos por incidente';
  end if;

  if not exists (select 1 from motorista where id = p_motorista_id) then
    raise exception 'motorista nao encontrado';
  end if;

  insert into incidente (motorista_id, locadora_id, placa, tipo, descricao, valor, confianca, criado_por)
  values (p_motorista_id, v_locadora, v_placa, p_tipo, btrim(p_descricao), p_valor, p_confianca, auth.uid())
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_anexos)
  loop
    v_caminho := v_item->>'caminho';
    v_hash := lower(nullif(v_item->>'hash', ''));
    if v_caminho is null or v_caminho not like v_locadora || '/%' then
      raise exception 'anexo fora da pasta da sua locadora';
    end if;
    if exists (select 1 from anexo where caminho = v_caminho) then
      raise exception 'anexo ja vinculado';
    end if;
    if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'hash sha-256 do anexo ausente ou invalido';
    end if;
    insert into anexo (incidente_id, locadora_id, caminho, content_type, bytes, hash)
    values (v_id, v_locadora, v_caminho,
            v_item->>'content_type', nullif(v_item->>'bytes', '')::bigint, v_hash);
  end loop;

  perform registrar_auditoria(
    v_locadora, 'incidente.criar', 'incidente', v_id, null,
    jsonb_build_object('motorista_id', p_motorista_id, 'tipo', p_tipo,
                       'placa', v_placa, 'estado', 'suspeita', 'anexos', v_qtd,
                       'hashes', (
                         select jsonb_agg(v_item->>'hash')
                           from jsonb_array_elements(p_anexos) v_item
                       ))
  );

  return v_id;
end;
$$;

-- detalhe expoe o hash para prova de integridade
create or replace function detalhe_incidente(p_incidente_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_inc incidente%rowtype;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  select * into v_inc from incidente where id = p_incidente_id;
  if v_inc.id is null or v_inc.locadora_id <> v_locadora then
    raise exception 'incidente nao encontrado';
  end if;

  return jsonb_build_object(
    'id', v_inc.id,
    'placa', v_inc.placa,
    'tipo', v_inc.tipo,
    'valor', v_inc.valor,
    'descricao', v_inc.descricao,
    'estado', v_inc.estado,
    'confianca', v_inc.confianca,
    'motivo', v_inc.motivo,
    'criado_em', v_inc.criado_em,
    'atualizado_em', v_inc.atualizado_em,
    'criado_por_nome', (select nome from perfil where id = v_inc.criado_por),
    'motorista', (
      select jsonb_build_object(
               'id', m.id,
               'nome_completo', m.nome_completo,
               'cpf_mascarado', mascara_cpf(m.cpf)
             )
        from motorista m where m.id = v_inc.motorista_id
    ),
    'anexos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id, 'caminho', a.caminho,
               'content_type', a.content_type, 'bytes', a.bytes,
               'hash', a.hash
             ) order by a.criado_em)
        from anexo a where a.incidente_id = v_inc.id
    ), '[]'::jsonb),
    'historico', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', al.id,
               'acao', al.acao,
               'ator_nome', p.nome,
               'antes', al.antes,
               'depois', al.depois,
               'criado_em', al.criado_em
             ) order by al.id desc)
        from audit_log al
        left join perfil p on p.id = al.ator
       where al.alvo_tipo = 'incidente'
         and al.alvo_id = v_inc.id
         and al.locadora_id = v_locadora
    ), '[]'::jsonb)
  );
end;
$$;
