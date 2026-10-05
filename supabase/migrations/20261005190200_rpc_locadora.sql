-- HistóricoDrive — 0003 RPCs de cadastro, perfil e locadora

-- Chamada logo apos o signUp. So exige sessao: o perfil ainda nao existe.
create or replace function solicitar_cadastro(
  p_nome_locadora text,
  p_cnpj text,
  p_cidade text,
  p_uf text,
  p_email_contato text,
  p_nome_dono text
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
begin
  if v_uid is null then
    raise exception 'nao autenticado';
  end if;
  if p_cnpj is not null and p_cnpj !~ '^[0-9]{14}$' then
    raise exception 'cnpj invalido';
  end if;
  if v_uf is not null and v_uf !~ '^[A-Z]{2}$' then
    raise exception 'uf invalida';
  end if;

  insert into locadora (nome, cnpj, cidade, uf, email_contato, criado_por)
  values (btrim(p_nome_locadora), nullif(btrim(coalesce(p_cnpj, '')), ''),
          nullif(btrim(coalesce(p_cidade, '')), ''), v_uf, btrim(p_email_contato), v_uid)
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
    jsonb_build_object('status', 'pendente', 'nome', p_nome_locadora)
  );

  return v_locadora_id;
end;
$$;

create or replace function meu_perfil()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_perfil perfil;
  v_locadoras jsonb;
begin
  perform exigir_autenticado();
  select * into v_perfil from perfil where id = auth.uid();

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id, 'nome', l.nome, 'status', l.status
         ) order by l.nome), '[]'::jsonb)
    into v_locadoras
    from perfil_locadora pl
    join locadora l on l.id = pl.locadora_id
   where pl.perfil_id = auth.uid();

  return jsonb_build_object(
    'id', v_perfil.id,
    'nome', v_perfil.nome,
    'papel', v_perfil.papel,
    'locadora_ativa', v_perfil.locadora_ativa,
    'locadoras', v_locadoras
  );
end;
$$;

create or replace function definir_locadora_ativa(p_locadora_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform exigir_autenticado();
  -- a constraint composite ja garante que a locadora e de membership
  update perfil set locadora_ativa = p_locadora_id where id = auth.uid();
  if not found then
    raise exception 'locadora nao disponivel para este perfil';
  end if;
end;
$$;

-- somente superadmin
create or replace function listar_pendentes()
returns table (
  id uuid,
  nome text,
  cnpj text,
  cidade text,
  uf char(2),
  email_contato text,
  criado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();
  return query
    select l.id, l.nome, l.cnpj, l.cidade, l.uf, l.email_contato, l.criado_em
      from locadora l
     where l.status = 'pendente'
     order by l.criado_em;
end;
$$;

create or replace function decidir_locadora(
  p_locadora_id uuid,
  p_acao text,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes jsonb;
  v_status status_locadora;
begin
  perform exigir_superadmin();

  if p_acao not in ('aprovar', 'recusar') then
    raise exception 'acao invalida: %', p_acao;
  end if;
  if p_acao = 'recusar' and (p_motivo is null or length(btrim(p_motivo)) < 5) then
    raise exception 'recusa exige motivo';
  end if;

  select to_jsonb(l) into v_antes from locadora l where l.id = p_locadora_id;
  if v_antes is null then
    raise exception 'locadora nao encontrada';
  end if;

  v_status := case when p_acao = 'aprovar' then 'aprovada'::status_locadora
                   else 'recusada'::status_locadora end;

  update locadora
     set status = v_status,
         motivo_recusa = case when v_status = 'recusada' then btrim(p_motivo) else null end,
         aprovado_em = now(),
         aprovado_por = auth.uid()
   where id = p_locadora_id;

  perform registrar_auditoria(
    p_locadora_id, 'locadora.' || p_acao, 'locadora', p_locadora_id,
    v_antes, jsonb_build_object('status', v_status, 'motivo', p_motivo)
  );
end;
$$;

-- configuracoes da locadora pelo dono (tela 9)
create or replace function atualizar_minha_locadora(
  p_nome text,
  p_cidade text,
  p_uf text,
  p_email_contato text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_antes jsonb;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();
  v_antes := to_jsonb(l) from locadora l where l.id = v_locadora;

  update locadora
     set nome = btrim(p_nome),
         cidade = nullif(btrim(coalesce(p_cidade, '')), ''),
         uf = case when p_uf is null or btrim(p_uf) = '' then null else upper(btrim(p_uf)) end,
         email_contato = btrim(p_email_contato)
   where id = v_locadora;

  perform registrar_auditoria(
    v_locadora, 'locadora.atualizar', 'locadora', v_locadora,
    v_antes, jsonb_build_object('nome', p_nome, 'cidade', p_cidade, 'uf', p_uf)
  );
end;
$$;

create or replace function definir_receber_da_rede(p_valor boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_antes boolean;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();
  select receber_da_rede into v_antes from locadora where id = v_locadora;

  update locadora set receber_da_rede = p_valor where id = v_locadora;

  perform registrar_auditoria(
    v_locadora, 'locadora.rede', 'locadora', v_locadora,
    jsonb_build_object('receber_da_rede', v_antes),
    jsonb_build_object('receber_da_rede', p_valor)
  );
end;
$$;
