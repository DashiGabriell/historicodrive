-- Histórico — 0010 fluxos de defesa (T05–T09)
-- Termos no cadastro, purge de suspeita, aviso de cruzamento,
-- contestação pública e fila de decisão.
-- Fonte: docs/adr/0004, docs/adr/0005, docs/spec-defesa-legal.md

-- ------------------------------------------------------------------
-- T05: aceite obrigatório dos Termos no cadastro da locadora
-- ------------------------------------------------------------------
create or replace function solicitar_cadastro(
  p_nome_locadora text,
  p_cnpj text,
  p_cidade text,
  p_uf text,
  p_email_contato text,
  p_nome_dono text,
  p_aceitou_termos boolean default false,
  p_termos_versao text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_locadora_id uuid;
  v_uf text := case when p_uf is null then null else upper(btrim(p_uf)) end;
  v_versao text := nullif(btrim(coalesce(p_termos_versao, '')), '');
begin
  if v_uid is null then
    raise exception 'nao autenticado';
  end if;
  if coalesce(p_aceitou_termos, false) <> true then
    raise exception 'aceite dos termos obrigatorio';
  end if;
  if v_versao is null then
    raise exception 'versao dos termos obrigatoria';
  end if;
  if v_versao !~ '^1\.[0-9]+$' then
    raise exception 'versao dos termos invalida';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^[0-9]{14}$' then
    raise exception 'cnpj invalido';
  end if;
  if v_uf is not null and v_uf !~ '^[A-Z]{2}$' then
    raise exception 'uf invalida';
  end if;

  insert into locadora (nome, cnpj, cidade, uf, email_contato, criado_por,
                        termos_versao, termos_aceite_em, termos_aceite_por)
  values (btrim(p_nome_locadora), nullif(btrim(coalesce(p_cnpj, '')), ''),
          nullif(btrim(coalesce(p_cidade, '')), ''), v_uf, btrim(p_email_contato), v_uid,
          v_versao, now(), v_uid)
  returning id into v_locadora_id;

  insert into perfil (id, nome, papel)
  values (v_uid, btrim(p_nome_dono), 'dono')
  on conflict (id) do update set nome = excluded.nome;

  insert into perfil_locadora (perfil_id, locadora_id)
  values (v_uid, v_locadora_id)
  on conflict do nothing;

  update perfil set locadora_ativa = v_locadora_id where id = v_uid;

  perform registrar_auditoria(
    v_locadora_id, 'locadora.solicitar', 'locadora', v_locadora_id, null,
    jsonb_build_object('status', 'pendente', 'nome', p_nome_locadora,
                       'termos_versao', v_versao, 'termos_aceite_em', now())
  );

  return v_locadora_id;
end;
$$;

revoke execute on function solicitar_cadastro(text, text, text, text, text, text, boolean, text)
  from public, anon;
grant execute on function solicitar_cadastro(text, text, text, text, text, text, boolean, text)
  to authenticated, service_role;
drop function if exists solicitar_cadastro(text, text, text, text, text, text);

-- ------------------------------------------------------------------
-- T06: purge de suspeita nunca confirmada (retencoes do playbook)
-- ------------------------------------------------------------------
create or replace function purge_suspeitas_nao_confirmadas(p_dias int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := 0;
  v_dias int := greatest(coalesce(p_dias, 30), 30);
  v_corte timestamptz := now() - make_interval(days => v_dias);
  v_inc incidente%rowtype;
begin
  perform exigir_superadmin();

  for v_inc in
    select * from incidente i
     where i.estado = 'suspeita'
       and i.criado_em < v_corte
       and not exists (
         select 1 from contestacao c where c.incidente_id = i.id
       )
     for update of i
  loop
    perform registrar_auditoria(
      v_inc.locadora_id, 'incidente.purge', 'incidente', v_inc.id,
      to_jsonb(v_inc),
      jsonb_build_object('motivo', 'suspeita nao confirmada apos ' || v_dias || ' dias')
    );
    delete from incidente where id = v_inc.id;
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke execute on function purge_suspeitas_nao_confirmadas(int) from public, anon;
grant execute on function purge_suspeitas_nao_confirmadas(int) to authenticated, service_role;

-- ------------------------------------------------------------------
-- T07: alerta in-app (cruzamento na rede / contestação)
-- ------------------------------------------------------------------
create table notificacao (
  id uuid primary key default gen_random_uuid(),
  locadora_id uuid not null references locadora (id),
  incidente_id uuid references incidente (id) on delete cascade,
  tipo text not null check (tipo in ('cruzamento', 'contestacao', 'recurso')),
  titulo text not null,
  corpo text,
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);

create index notificacao_locadora_idx on notificacao (locadora_id, criado_em desc);

alter table notificacao enable row level security;
revoke all on notificacao from anon, authenticated;

create or replace function criar_notificacao(
  p_locadora_id uuid,
  p_incidente_id uuid,
  p_tipo text,
  p_titulo text,
  p_corpo text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into notificacao (locadora_id, incidente_id, tipo, titulo, corpo)
  values (p_locadora_id, p_incidente_id, p_tipo, p_titulo, p_corpo);
$$;

revoke execute on function criar_notificacao(uuid, uuid, text, text, text) from public, anon, authenticated;

create or replace function listar_notificacoes(p_limite int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', n.id, 'tipo', n.tipo, 'titulo', n.titulo, 'corpo', n.corpo,
             'incidente_id', n.incidente_id, 'lida', n.lida_em is not null,
             'criado_em', n.criado_em
           ) order by n.criado_em desc)
      from notificacao n
     where n.locadora_id = v_locadora
     limit least(greatest(coalesce(p_limite, 20), 1), 100)
  ), '[]'::jsonb);
end;
$$;

create or replace function marcar_notificacao_lida(p_notificacao_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();
  update notificacao
     set lida_em = now()
   where id = p_notificacao_id
     and locadora_id = v_locadora
     and lida_em is null;
end;
$$;

revoke execute on function listar_notificacoes(int) from public, anon;
revoke execute on function marcar_notificacao_lida(uuid) from public, anon;
grant execute on function listar_notificacoes(int) to authenticated, service_role;
grant execute on function marcar_notificacao_lida(uuid) to authenticated, service_role;

-- mudar_estado: alerta a locadora quando o incidente entra na rede
create or replace function mudar_estado_incidente(
  p_incidente_id uuid,
  p_novo_estado estado_incidente,
  p_motivo text,
  p_confianca confianca_incidente default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inc incidente%rowtype;
  v_antes jsonb;
  v_valido boolean;
  v_confianca confianca_incidente;
begin
  perform exigir_dono();

  if p_motivo is null or length(btrim(p_motivo)) < 5 then
    raise exception 'toda transicao exige motivo';
  end if;

  select * into v_inc from incidente where id = p_incidente_id;
  if v_inc.id is null then
    raise exception 'incidente nao encontrado';
  end if;
  if v_inc.locadora_id <> minha_locadora() then
    raise exception 'acesso negado: incidente de outra locadora';
  end if;
  if v_inc.estado = p_novo_estado then
    raise exception 'estado ja e %', p_novo_estado;
  end if;

  v_valido := (v_inc.estado = 'suspeita'   and p_novo_estado in ('confirmado', 'contestado'))
           or (v_inc.estado = 'confirmado' and p_novo_estado = 'contestado')
           or (v_inc.estado = 'contestado' and p_novo_estado = 'confirmado');
  if not v_valido then
    raise exception 'transicao % -> % nao permitida', v_inc.estado, p_novo_estado;
  end if;

  v_antes := to_jsonb(v_inc);
  v_confianca := coalesce(p_confianca, v_inc.confianca);

  update incidente
     set estado = p_novo_estado,
         confianca = v_confianca,
         motivo = btrim(p_motivo),
         atualizado_em = now()
   where id = p_incidente_id;

  perform registrar_auditoria(
    v_inc.locadora_id, 'incidente.' || p_novo_estado, 'incidente', p_incidente_id,
    v_antes, jsonb_build_object('estado', p_novo_estado, 'motivo', p_motivo,
                                'confianca', v_confianca)
  );

  if p_novo_estado = 'confirmado' and v_confianca = 'alta' then
    perform criar_notificacao(
      v_inc.locadora_id, p_incidente_id, 'cruzamento',
      'Incidente visivel na rede',
      'O incidente confirmado de alta confianca agora cruza na rede das locadoras.'
    );
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- T08: contestação pública com verificacao de CPF (anon)
-- ------------------------------------------------------------------
create or replace function consultar_ficha_contestacao(p_cpf text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_motorista_id uuid;
begin
  if v_cpf !~ '^[0-9]{11}$' then
    return jsonb_build_object('existe', false, 'incidentes', '[]'::jsonb);
  end if;

  select id into v_motorista_id from motorista where cpf = v_cpf limit 1;
  if v_motorista_id is null then
    return jsonb_build_object('existe', false, 'incidentes', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'existe', true,
    'incidentes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id,
               'tipo', i.tipo,
               'estado', i.estado,
               'criado_em', i.criado_em,
               'locadora_nome', l.nome,
               'tem_contestacao_aberta', exists (
                 select 1 from contestacao c
                  where c.incidente_id = i.id and c.estado = 'aberta'
               )
             ) order by i.criado_em desc)
        from incidente i
        join locadora l on l.id = i.locadora_id
       where i.motorista_id = v_motorista_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function abrir_contestacao(
  p_incidente_id uuid,
  p_cpf text,
  p_nome text,
  p_email text,
  p_descricao text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_motorista_id uuid;
  v_inc incidente%rowtype;
  v_id uuid;
begin
  if v_cpf !~ '^[0-9]{11}$'
     or length(btrim(coalesce(p_nome, ''))) < 5
     or coalesce(p_email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(btrim(coalesce(p_descricao, ''))) < 20 then
    raise exception 'registro nao encontrado ou dados invalidos';
  end if;

  select id into v_motorista_id from motorista where cpf = v_cpf;
  select * into v_inc from incidente where id = p_incidente_id;
  if v_motorista_id is null or v_inc.id is null or v_inc.motorista_id <> v_motorista_id then
    raise exception 'registro nao encontrado ou dados invalidos';
  end if;

  if exists (
    select 1 from contestacao
     where incidente_id = p_incidente_id and estado = 'aberta'
  ) then
    raise exception 'ja existe contestacao aberta para este incidente';
  end if;

  insert into contestacao (
    incidente_id, motorista_id, locadora_dona,
    nome_titular, email_titular, descricao
  )
  values (
    p_incidente_id, v_motorista_id, v_inc.locadora_id,
    btrim(p_nome), btrim(p_email), btrim(p_descricao)
  )
  returning id into v_id;

  if v_inc.estado in ('suspeita', 'confirmado') then
    update incidente
       set estado = 'contestado',
           motivo = 'contestacao aberta pelo titular',
           atualizado_em = now()
     where id = p_incidente_id;

    perform registrar_auditoria(
      v_inc.locadora_id, 'incidente.contestado', 'incidente', p_incidente_id,
      to_jsonb(v_inc),
      jsonb_build_object('estado', 'contestado', 'via', 'contestacao',
                         'contestacao_id', v_id)
    );
  end if;

  perform registrar_auditoria(
    v_inc.locadora_id, 'contestacao.abrir', 'contestacao', v_id, null,
    jsonb_build_object('incidente_id', p_incidente_id, 'motorista_id', v_motorista_id)
  );

  perform criar_notificacao(
    v_inc.locadora_id, p_incidente_id, 'contestacao',
    'Nova contestacao',
    'O titular contestou este incidente. Responda em ate 15 dias uteis.'
  );

  return v_id;
end;
$$;

revoke execute on function consultar_ficha_contestacao(text) from public;
revoke execute on function abrir_contestacao(uuid, text, text, text, text) from public;
grant execute on function consultar_ficha_contestacao(text) to anon, authenticated, service_role;
grant execute on function abrir_contestacao(uuid, text, text, text, text) to anon, authenticated, service_role;

-- ------------------------------------------------------------------
-- T09: fila da locadora + recurso do superadmin
-- ------------------------------------------------------------------
create or replace function listar_contestacoes()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id,
             'incidente_id', c.incidente_id,
             'placa', i.placa,
             'tipo', i.tipo,
             'estado_incidente', i.estado,
             'motorista_nome', m.nome_completo,
             'nome_titular', c.nome_titular,
             'email_titular', c.email_titular,
             'descricao', c.descricao,
             'aberto_em', c.aberto_em,
             'prazo_locadora_em', c.prazo_locadora_em,
             'estado', c.estado,
             'motivo', c.motivo
           ) order by c.aberto_em desc)
        from contestacao c
        join incidente i on i.id = c.incidente_id
        join motorista m on m.id = c.motorista_id
       where c.locadora_dona = v_locadora
    ), '[]'::jsonb);
end;
$$;

create or replace function listar_contestacoes_recurso()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id,
             'incidente_id', c.incidente_id,
             'locadora_nome', l.nome,
             'placa', i.placa,
             'tipo', i.tipo,
             'estado_incidente', i.estado,
             'motorista_nome', m.nome_completo,
             'nome_titular', c.nome_titular,
             'descricao', c.descricao,
             'aberto_em', c.aberto_em,
             'prazo_locadora_em', c.prazo_locadora_em,
             'estado', c.estado
           ) order by c.prazo_locadora_em)
        from contestacao c
        join incidente i on i.id = c.incidente_id
        join motorista m on m.id = c.motorista_id
        join locadora l on l.id = c.locadora_dona
       where c.estado = 'aberta'
         and c.prazo_locadora_em < now()
    ), '[]'::jsonb);
end;
$$;

create or replace function finalizar_contestacao(
  p_contestacao_id uuid,
  p_procede boolean,
  p_motivo text,
  p_recurso boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c contestacao%rowtype;
  v_inc incidente%rowtype;
  v_estado estado_contestacao;
begin
  if p_procede is null then
    raise exception 'decisao invalida';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'decisao exige motivo';
  end if;

  if coalesce(p_recurso, false) then
    perform exigir_superadmin();
  else
    perform exigir_dono();
  end if;

  select * into c from contestacao where id = p_contestacao_id for update;
  if c.id is null then
    raise exception 'contestacao nao encontrada';
  end if;
  if c.estado <> 'aberta' then
    raise exception 'contestacao ja decidida';
  end if;

  if coalesce(p_recurso, false) then
    if c.prazo_locadora_em >= now() then
      raise exception 'recurso so apos o prazo da locadora';
    end if;
  else
    if c.locadora_dona <> minha_locadora() then
      raise exception 'acesso negado: contestacao de outra locadora';
    end if;
  end if;

  v_estado := case when coalesce(p_procede, false) then 'procedente' else 'improcedente' end;

  update contestacao
     set estado = v_estado,
         decido_por = auth.uid(),
         decidido_em = now(),
         motivo = btrim(p_motivo)
   where id = c.id;

  if not coalesce(p_procede, false) then
    select * into v_inc from incidente where id = c.incidente_id for update;
    if v_inc.estado = 'contestado' then
      update incidente
         set estado = 'confirmado',
             motivo = 'contestacao improcedente: ' || btrim(p_motivo),
             atualizado_em = now()
       where id = v_inc.id;

      perform registrar_auditoria(
        v_inc.locadora_id, 'incidente.confirmado', 'incidente', v_inc.id,
        to_jsonb(v_inc),
        jsonb_build_object('estado', 'confirmado', 'via', 'contestacao_improcedente',
                           'contestacao_id', c.id)
      );
    end if;
  end if;

  perform registrar_auditoria(
    c.locadora_dona, 'contestacao.' || v_estado, 'contestacao', c.id,
    jsonb_build_object('estado', 'aberta'),
    jsonb_build_object('estado', v_estado, 'motivo', p_motivo, 'recurso', coalesce(p_recurso, false))
  );

  perform criar_notificacao(
    c.locadora_dona, c.incidente_id, 'contestacao',
    'Contestacao ' || v_estado,
    'Decisao registrada: ' || left(btrim(p_motivo), 160)
  );
end;
$$;

create or replace function decidir_contestacao(
  p_contestacao_id uuid,
  p_procede boolean,
  p_motivo text
)
returns void
language sql
security definer
set search_path = public
as $$
  select finalizar_contestacao(p_contestacao_id, p_procede, p_motivo, false);
$$;

create or replace function decidir_contestacao_recurso(
  p_contestacao_id uuid,
  p_procede boolean,
  p_motivo text
)
returns void
language sql
security definer
set search_path = public
as $$
  select finalizar_contestacao(p_contestacao_id, p_procede, p_motivo, true);
$$;

revoke execute on function listar_contestacoes() from public, anon;
revoke execute on function listar_contestacoes_recurso() from public, anon;
revoke execute on function finalizar_contestacao(uuid, boolean, text, boolean) from public, anon;
revoke execute on function decidir_contestacao(uuid, boolean, text) from public, anon;
revoke execute on function decidir_contestacao_recurso(uuid, boolean, text) from public, anon;

grant execute on function listar_contestacoes() to authenticated, service_role;
grant execute on function listar_contestacoes_recurso() to authenticated, service_role;
grant execute on function finalizar_contestacao(uuid, boolean, text, boolean) to authenticated, service_role;
grant execute on function decidir_contestacao(uuid, boolean, text) to authenticated, service_role;
grant execute on function decidir_contestacao_recurso(uuid, boolean, text) to authenticated, service_role;

-- ------------------------------------------------------------------
-- T07/T08: badge de rede no detalhe do incidente
-- ------------------------------------------------------------------
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
  v_desde timestamptz;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  select * into v_inc from incidente where id = p_incidente_id;
  if v_inc.id is null or v_inc.locadora_id <> v_locadora then
    raise exception 'incidente nao encontrado';
  end if;

  if v_inc.estado = 'confirmado' and v_inc.confianca = 'alta' then
    select min(al.criado_em) into v_desde
      from audit_log al
     where al.alvo_tipo = 'incidente'
       and al.alvo_id = v_inc.id
       and al.acao = 'incidente.confirmado'
       and (al.depois->>'confianca') = 'alta';
    v_desde := coalesce(v_desde, v_inc.atualizado_em);
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
    'visivel_na_rede', v_desde is not null,
    'visivel_na_rede_desde', v_desde,
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
    ), '[]'::jsonb),
    'contestacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'estado', c.estado,
               'aberto_em', c.aberto_em,
               'prazo_locadora_em', c.prazo_locadora_em,
               'descricao', c.descricao,
               'motivo', c.motivo
             ) order by c.aberto_em desc)
        from contestacao c
       where c.incidente_id = v_inc.id
    ), '[]'::jsonb)
  );
end;
$$;
