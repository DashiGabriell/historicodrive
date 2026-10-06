-- Histórico — 0011 endurecimento de segurança e LGPD
-- 1. superfície de RPC: funções internas saem de anon/authenticated
-- 2. storage: pasta da locadora ativa e aprovada; só rascunho órfão é apagável
-- 3. contestação pública: CPF + nascimento, limite de tentativas, sem listar
-- 4. retenção automática (pg_cron): suspeita 30 dias, confirmado 5 anos,
--    trilha minimizada e arquivos descartados pela Storage API (pg_net)
-- Fonte: docs/adr/0005 (revisão de retenção), docs/spec-defesa-legal.md

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ------------------------------------------------------------------
-- 1. superfície de RPC
-- ------------------------------------------------------------------
-- o Supabase concede EXECUTE a anon/authenticated em toda função nova; o
-- grant implícito a PUBLIC continua, então toda migration fecha com o
-- revoke/grant do fim deste arquivo (scripts/verificar-defesa.ps1 confere).
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;

-- ------------------------------------------------------------------
-- 2. storage
-- ------------------------------------------------------------------
create or replace function e_minha_pasta(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_caminho like minha_locadora()::text || '/%', false);
$$;

create or replace function pode_enviar_anexo(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_caminho like minha_locadora()::text || '/rascunho/%', false);
$$;

-- prova de incidente registrado nunca é apagada pelo cliente
create or replace function pode_descartar_anexo(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_caminho like minha_locadora()::text || '/rascunho/%', false)
     and not exists (select 1 from anexo a where a.caminho = p_caminho);
$$;

drop policy if exists anexo_leitura on storage.objects;
create policy anexo_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and e_minha_pasta(name));

drop policy if exists anexo_carga on storage.objects;
create policy anexo_carga on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and pode_enviar_anexo(name));

drop policy if exists anexo_remocao on storage.objects;
create policy anexo_remocao on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and pode_descartar_anexo(name));

-- ------------------------------------------------------------------
-- 3. contestação pública
-- ------------------------------------------------------------------
create table if not exists config_privada (
  chave text primary key,
  valor text not null
);
alter table config_privada enable row level security;
revoke all on config_privada from anon, authenticated;

insert into config_privada (chave, valor)
values ('sal_tentativa', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;

-- chave guardada como HMAC: o log de tentativas não guarda CPF nem IP
create table if not exists tentativa_publica (
  id bigint generated always as identity primary key,
  acao text not null,
  chave text not null,
  criado_em timestamptz not null default now()
);
create index if not exists tentativa_publica_idx
  on tentativa_publica (acao, chave, criado_em desc);
alter table tentativa_publica enable row level security;
revoke all on tentativa_publica from anon, authenticated;

create or replace function ip_da_requisicao()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(btrim(h->>'cf-connecting-ip'), ''),
    nullif(btrim(h->>'x-real-ip'), ''),
    nullif(btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), ''),
    'desconhecido'
  )
  from (
    select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb as h
  ) req;
$$;

create or replace function chave_privada(p_valor text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(
    extensions.hmac(
      coalesce(p_valor, ''),
      (select valor from config_privada where chave = 'sal_tentativa'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function limitar_tentativa(
  p_acao text,
  p_chave text,
  p_limite int,
  p_janela interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chave text := chave_privada(p_chave);
  v_total int;
begin
  select count(*) into v_total
    from tentativa_publica
   where acao = p_acao
     and chave = v_chave
     and criado_em > now() - p_janela;

  if v_total >= p_limite then
    return false;
  end if;

  insert into tentativa_publica (acao, chave) values (p_acao, v_chave);
  return true;
end;
$$;

create or replace function exigir_cota_publica(
  p_acao text,
  p_cpf text,
  p_limite_ip int,
  p_limite_cpf int,
  p_limite_global int,
  p_janela interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not limitar_tentativa(p_acao || ':global', 'global', p_limite_global, p_janela)
     or not limitar_tentativa(p_acao || ':ip', ip_da_requisicao(), p_limite_ip, p_janela)
     or not limitar_tentativa(p_acao || ':cpf', p_cpf, p_limite_cpf, p_janela) then
    raise exception 'muitas tentativas: aguarde e tente novamente mais tarde';
  end if;
end;
$$;

-- titular sem data de nascimento cadastrada não se verifica pelo canal público
create or replace function verificar_titular(p_cpf text, p_nascimento date)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id
    from motorista m
   where m.cpf = p_cpf
     and m.nascimento is not null
     and m.nascimento = p_nascimento;
$$;

-- improcedente não reabre pelo canal público: evita tirar o registro da rede em loop
create or replace function incidente_contestavel(p_incidente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from incidente i
     where i.id = p_incidente_id
       and i.estado = 'confirmado'
       and not exists (
         select 1 from contestacao c
          where c.incidente_id = i.id
            and c.estado in ('aberta', 'improcedente')
       )
  );
$$;

drop function if exists consultar_ficha_contestacao(text);
drop function if exists abrir_contestacao(uuid, text, text, text, text);

create or replace function consultar_ficha_contestacao(p_cpf text, p_nascimento date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_motorista_id uuid;
  v_vazio constant jsonb := jsonb_build_object('existe', false, 'contestavel', false);
begin
  if v_cpf !~ '^[0-9]{11}$' or p_nascimento is null then
    return v_vazio;
  end if;

  -- IP de operadora móvel é compartilhado (CGNAT): o limite fino é por CPF
  perform exigir_cota_publica('consulta', v_cpf, 30, 5, 500, interval '1 hour');

  v_motorista_id := verificar_titular(v_cpf, p_nascimento);
  if v_motorista_id is null then
    return v_vazio;
  end if;

  return jsonb_build_object(
    'existe', exists (
      select 1 from incidente i
       where i.motorista_id = v_motorista_id
         and i.estado in ('confirmado', 'contestado')
    ),
    'contestavel', exists (
      select 1 from incidente i
       where i.motorista_id = v_motorista_id
         and incidente_contestavel(i.id)
    )
  );
end;
$$;

-- falha de verificação devolve {ok:false} em vez de exceção: a tentativa
-- precisa ficar gravada para o limite contar
create or replace function abrir_contestacao(
  p_cpf text,
  p_nascimento date,
  p_nome text,
  p_email text,
  p_descricao text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  v_motorista_id uuid;
  v_inc incidente%rowtype;
  v_id uuid;
  v_protocolos jsonb := '[]'::jsonb;
begin
  if v_cpf !~ '^[0-9]{11}$'
     or p_nascimento is null
     or length(btrim(coalesce(p_nome, ''))) < 5
     or coalesce(p_email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or length(btrim(coalesce(p_descricao, ''))) < 20 then
    return jsonb_build_object('ok', false, 'erro', 'dados_invalidos');
  end if;

  perform exigir_cota_publica('contestacao', v_cpf, 10, 5, 100, interval '1 day');

  v_motorista_id := verificar_titular(v_cpf, p_nascimento);
  if v_motorista_id is null then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  for v_inc in
    select * from incidente i
     where i.motorista_id = v_motorista_id
       and incidente_contestavel(i.id)
     order by i.criado_em
     for update of i
  loop
    insert into contestacao (
      incidente_id, motorista_id, locadora_dona,
      nome_titular, email_titular, descricao
    )
    values (
      v_inc.id, v_motorista_id, v_inc.locadora_id,
      btrim(p_nome), btrim(p_email), btrim(p_descricao)
    )
    returning id into v_id;

    update incidente
       set estado = 'contestado',
           motivo = 'contestacao aberta pelo titular',
           atualizado_em = now()
     where id = v_inc.id;

    perform registrar_auditoria(
      v_inc.locadora_id, 'incidente.contestado', 'incidente', v_inc.id,
      jsonb_build_object('estado', v_inc.estado, 'confianca', v_inc.confianca),
      jsonb_build_object('estado', 'contestado', 'via', 'contestacao',
                         'contestacao_id', v_id)
    );

    perform registrar_auditoria(
      v_inc.locadora_id, 'contestacao.abrir', 'contestacao', v_id, null,
      jsonb_build_object('incidente_id', v_inc.id, 'motorista_id', v_motorista_id)
    );

    perform criar_notificacao(
      v_inc.locadora_id, v_inc.id, 'contestacao',
      'Nova contestacao',
      'O titular contestou este incidente. Responda em ate 15 dias uteis.'
    );

    v_protocolos := v_protocolos || to_jsonb(v_id::text);
  end loop;

  if jsonb_array_length(v_protocolos) = 0 then
    return jsonb_build_object('ok', false, 'erro', 'nada_a_contestar');
  end if;

  return jsonb_build_object('ok', true, 'protocolos', v_protocolos);
end;
$$;

-- nascimento passa a ser a segunda prova do titular: obrigatório no cadastro
-- novo e completado quando a ficha antiga não tinha
create or replace function criar_ou_localizar_motorista(
  p_cpf text,
  p_nome_completo text,
  p_nascimento date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_id uuid;
  v_nascimento date;
begin
  perform exigir_dono();

  if v_cpf !~ '^[0-9]{11}$' then
    raise exception 'cpf invalido';
  end if;
  if length(btrim(coalesce(p_nome_completo, ''))) < 5 then
    raise exception 'nome completo invalido';
  end if;
  if p_nascimento is not null
     and (p_nascimento > current_date - interval '18 years'
          or p_nascimento < date '1900-01-01') then
    raise exception 'data de nascimento invalida';
  end if;

  select id, nascimento into v_id, v_nascimento from motorista where cpf = v_cpf;

  if v_id is null then
    if p_nascimento is null then
      raise exception 'data de nascimento obrigatoria';
    end if;

    insert into motorista (cpf, nome_completo, nascimento)
    values (v_cpf, btrim(p_nome_completo), p_nascimento)
    returning id into v_id;

    perform registrar_auditoria(
      minha_locadora(), 'motorista.criar', 'motorista', v_id, null,
      jsonb_build_object('cpf', mascara_cpf(v_cpf), 'nome', p_nome_completo)
    );
  elsif upper(btrim(p_nome_completo)) <> (select upper(nome_completo) from motorista where id = v_id) then
    raise exception 'cpf ja cadastrado com outro nome';
  elsif v_nascimento is null and p_nascimento is not null then
    update motorista set nascimento = p_nascimento where id = v_id;
    perform registrar_auditoria(
      minha_locadora(), 'motorista.nascimento', 'motorista', v_id, null,
      jsonb_build_object('nascimento_informado', true)
    );
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------------
-- 4. retenção
-- ------------------------------------------------------------------
-- consulta_log guarda só o uuid: o motorista expurgado não fica preso ao log
alter table consulta_log drop constraint if exists consulta_log_motorista_id_fkey;

-- arquivos só saem pela Storage API (storage.protect_delete); a fila guarda o caminho
create table if not exists anexo_descarte (
  caminho text primary key,
  enfileirado_em timestamptz not null default now(),
  tentativas int not null default 0,
  ultima_tentativa_em timestamptz
);
alter table anexo_descarte enable row level security;
revoke all on anexo_descarte from anon, authenticated;

-- só a redação LGPD, dentro de uma RPC definer, altera antes/depois;
-- quem, o quê, quando e sobre qual alvo continuam imutáveis
create or replace function audit_log_bloquear_mutacao()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and current_setting('hd.redacao_lgpd', true) = 'on'
     and new.id = old.id
     and new.locadora_id = old.locadora_id
     and new.ator = old.ator
     and new.acao = old.acao
     and new.alvo_tipo = old.alvo_tipo
     and new.alvo_id = old.alvo_id
     and new.criado_em = old.criado_em then
    return new;
  end if;
  raise exception 'audit_log e append-only: % nao permitido', tg_op;
end;
$$;

create or replace function minimizar_trilha(p jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when p is null or jsonb_typeof(p) <> 'object' then p
    else coalesce((
      select jsonb_object_agg(e.k, e.v)
        from jsonb_each(p) as e(k, v)
       where e.k in ('estado', 'confianca', 'tipo', 'via', 'contestacao_id',
                     'incidente_id', 'anexos', 'hashes', 'recurso', 'seed')
    ), '{}'::jsonb)
  end;
$$;

create or replace function redigir_trilha(p_alvo_tipo text, p_alvo_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('hd.redacao_lgpd', 'on', true);
  update audit_log
     set antes = minimizar_trilha(antes),
         depois = minimizar_trilha(depois)
   where alvo_tipo = p_alvo_tipo
     and alvo_id = any (p_alvo_ids);
  perform set_config('hd.redacao_lgpd', 'off', true);
end;
$$;

create or replace function expurgar_incidente(p_incidente_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inc incidente%rowtype;
  v_anexos int;
begin
  select * into v_inc from incidente where id = p_incidente_id for update;
  if v_inc.id is null then
    return;
  end if;

  select count(*) into v_anexos from anexo a where a.incidente_id = p_incidente_id;
  insert into anexo_descarte (caminho)
  select a.caminho from anexo a where a.incidente_id = p_incidente_id
  on conflict (caminho) do nothing;

  perform redigir_trilha('incidente', array[p_incidente_id]);
  perform redigir_trilha(
    'contestacao',
    array(select c.id from contestacao c where c.incidente_id = p_incidente_id)
  );

  delete from contestacao where incidente_id = p_incidente_id;
  delete from incidente where id = p_incidente_id;

  perform registrar_auditoria(
    v_inc.locadora_id, 'incidente.purge', 'incidente', p_incidente_id,
    jsonb_build_object('estado', v_inc.estado, 'confianca', v_inc.confianca,
                       'tipo', v_inc.tipo, 'criado_em', v_inc.criado_em,
                       'anexos', v_anexos),
    jsonb_build_object('motivo', p_motivo)
  );
end;
$$;

create or replace function expurgar_suspeitas(p_dias int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dias int := greatest(coalesce(p_dias, 30), 30);
  v_total int := 0;
  v_id uuid;
begin
  for v_id in
    select i.id from incidente i
     where i.estado = 'suspeita'
       and i.criado_em < now() - make_interval(days => v_dias)
       and not exists (select 1 from contestacao c where c.incidente_id = i.id)
  loop
    perform expurgar_incidente(v_id, 'suspeita nao confirmada apos ' || v_dias || ' dias');
    v_total := v_total + 1;
  end loop;
  return v_total;
end;
$$;

create or replace function purge_suspeitas_nao_confirmadas(p_dias int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();
  return expurgar_suspeitas(p_dias);
end;
$$;

create or replace function aplicar_retencao(
  p_dias_suspeita int default 30,
  p_anos_confirmado int default 5
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_anos int := greatest(coalesce(p_anos_confirmado, 5), 1);
  v_suspeitas int;
  v_vencidos int := 0;
  v_motoristas int := 0;
  v_rascunhos int;
  v_id uuid;
  m record;
begin
  v_suspeitas := expurgar_suspeitas(p_dias_suspeita);

  for v_id in
    select i.id from incidente i
     where i.estado in ('confirmado', 'contestado')
       and i.criado_em < now() - make_interval(years => v_anos)
  loop
    perform expurgar_incidente(v_id, 'prazo maximo de retencao de ' || v_anos || ' anos');
    v_vencidos := v_vencidos + 1;
  end loop;

  -- ficha sem nenhum incidente não tem finalidade: CPF e nome saem
  for m in
    select mo.id, mo.foto_caminho from motorista mo
     where mo.criado_em < now() - interval '1 day'
       and not exists (select 1 from incidente i where i.motorista_id = mo.id)
       and not exists (select 1 from contestacao c where c.motorista_id = mo.id)
  loop
    if m.foto_caminho is not null then
      insert into anexo_descarte (caminho) values (m.foto_caminho)
      on conflict (caminho) do nothing;
    end if;
    perform redigir_trilha('motorista', array[m.id]);
    delete from motorista where id = m.id;
    v_motoristas := v_motoristas + 1;
  end loop;

  -- foto de rascunho abandonado (descartado, logout, aba fechada)
  insert into anexo_descarte (caminho)
  select o.name from storage.objects o
   where o.bucket_id = 'anexos'
     and o.name like '%/rascunho/%'
     and o.created_at < now() - interval '2 days'
     and not exists (select 1 from anexo a where a.caminho = o.name)
  on conflict (caminho) do nothing;
  get diagnostics v_rascunhos = row_count;

  delete from tentativa_publica where criado_em < now() - interval '2 days';

  return jsonb_build_object(
    'suspeitas', v_suspeitas,
    'vencidos', v_vencidos,
    'motoristas', v_motoristas,
    'rascunhos', v_rascunhos
  );
end;
$$;

-- a chave fica no Vault (scripts/configurar-descarte.ps1); sem ela a fila espera
create or replace function processar_descarte_anexos(p_lote int default 100)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_chave text;
  v_cabecalhos jsonb;
  v_caminho text;
  v_total int := 0;
begin
  delete from anexo_descarte d
   where not exists (
     select 1 from storage.objects o
      where o.bucket_id = 'anexos' and o.name = d.caminho
   );

  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'hd_supabase_url';
  select decrypted_secret into v_chave
    from vault.decrypted_secrets where name = 'hd_service_role_key';
  if v_url is null or v_chave is null then
    return 0;
  end if;

  v_cabecalhos := case
    when v_chave like 'sb_secret_%' then jsonb_build_object('apikey', v_chave)
    else jsonb_build_object('apikey', v_chave, 'Authorization', 'Bearer ' || v_chave)
  end;

  for v_caminho in
    select caminho from anexo_descarte
     where tentativas < 20
     order by enfileirado_em
     limit greatest(coalesce(p_lote, 100), 1)
     for update skip locked
  loop
    perform net.http_delete(
      url := rtrim(v_url, '/') || '/storage/v1/object/anexos/' || v_caminho,
      headers := v_cabecalhos
    );
    update anexo_descarte
       set tentativas = tentativas + 1,
           ultima_tentativa_em = now()
     where caminho = v_caminho;
    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

select cron.schedule('hd-retencao-diaria', '30 6 * * *', 'select public.aplicar_retencao()');
select cron.schedule('hd-descarte-anexos', '*/10 * * * *', 'select public.processar_descarte_anexos()');

-- ------------------------------------------------------------------
-- superfície final: tudo fechado, depois só a lista pública
-- ------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  solicitar_cadastro(text, text, text, text, text, text, boolean, text),
  meu_perfil(),
  definir_locadora_ativa(uuid),
  listar_pendentes(),
  decidir_locadora(uuid, text, text),
  minha_locadora_dados(),
  atualizar_minha_locadora(text, text, text, text),
  definir_receber_da_rede(boolean),
  criar_ou_localizar_motorista(text, text, date),
  buscar_motorista(text),
  abrir_ficha(uuid, text),
  criar_incidente(uuid, text, tipo_incidente, text, numeric, confianca_incidente, jsonb),
  listar_incidentes(int),
  detalhe_incidente(uuid),
  mudar_estado_incidente(uuid, estado_incidente, text, confianca_incidente),
  painel_kpis(date, date),
  listar_auditoria(int, int),
  listar_notificacoes(int),
  marcar_notificacao_lida(uuid),
  listar_contestacoes(),
  listar_contestacoes_recurso(),
  decidir_contestacao(uuid, boolean, text),
  decidir_contestacao_recurso(uuid, boolean, text),
  purge_suspeitas_nao_confirmadas(int),
  e_minha_pasta(text),
  pode_enviar_anexo(text),
  pode_descartar_anexo(text)
to authenticated;

grant execute on function
  consultar_ficha_contestacao(text, date),
  abrir_contestacao(text, date, text, text, text)
to anon, authenticated;

grant execute on all functions in schema public to service_role;
