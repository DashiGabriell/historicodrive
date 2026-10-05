-- HistóricoDrive — 0004 RPCs de motorista, busca e incidentes
-- Regras anti-marketplace (docs/adr/0001) e de identidade (0002) vivem aqui.

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
begin
  perform exigir_dono();

  if v_cpf !~ '^[0-9]{11}$' then
    raise exception 'cpf invalido';
  end if;
  if length(btrim(p_nome_completo)) < 5 then
    raise exception 'nome completo invalido';
  end if;

  select id into v_id from motorista where cpf = v_cpf;

  if v_id is null then
    insert into motorista (cpf, nome_completo, nascimento)
    values (v_cpf, btrim(p_nome_completo), p_nascimento)
    returning id into v_id;

    perform registrar_auditoria(
      minha_locadora(), 'motorista.criar', 'motorista', v_id, null,
      jsonb_build_object('cpf', mascara_cpf(v_cpf), 'nome', p_nome_completo)
    );
  elsif upper(btrim(p_nome_completo)) <> (select upper(nome_completo) from motorista where id = v_id) then
    raise exception 'cpf ja cadastrado com outro nome';
  end if;

  return v_id;
end;
$$;

-- Busca crua. Nunca devolve contagem, feed ou lista sem termo digitado.
-- Nome exato devolve a lista para confirmacao; CPF exato devolve o match.
create or replace function buscar_motorista(p_termo text)
returns table (
  motorista_id uuid,
  nome_completo text,
  foto_caminho text,
  cpf_mascarado text,
  precisa_confirmar boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_rede boolean;
  v_digitos text;
begin
  perform exigir_autenticado();
  v_locadora := minha_locadora();
  if v_locadora is null then
    raise exception 'nenhuma locadora ativa';
  end if;
  select receber_da_rede into v_rede from locadora where id = v_locadora;

  if p_termo is null or length(btrim(p_termo)) < 3 then
    raise exception 'termo de busca muito curto';
  end if;

  v_digitos := regexp_replace(p_termo, '\D', '', 'g');

  if length(v_digitos) = 11 then
    return query
      select m.id, m.nome_completo, m.foto_caminho, mascara_cpf(m.cpf), false
        from motorista m
       where m.cpf = v_digitos
         and existe_visivel_para(m.id, v_locadora, v_rede)
       limit 5;
  else
    return query
      select m.id, m.nome_completo, m.foto_caminho, mascara_cpf(m.cpf), true
        from motorista m
       where upper(m.nome_completo) = upper(btrim(p_termo))
         and existe_visivel_para(m.id, v_locadora, v_rede)
       limit 25;
  end if;
end;
$$;

create or replace function existe_visivel_para(
  p_motorista_id uuid,
  p_minha_locadora uuid,
  p_minha_rede boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from incidente i
            where i.motorista_id = p_motorista_id
              and i.locadora_id = p_minha_locadora
         )
      or (p_minha_rede and exists (
           select 1 from incidente i
            where i.motorista_id = p_motorista_id
              and i.estado = 'confirmado'
              and i.confianca = 'alta'
         ));
$$;

-- Abre a ficha. Se a locadora ainda nao registrou o motorista, o CPF precisa
-- ser confirmado (documentado no ADR 0002).
create or replace function abrir_ficha(
  p_motorista_id uuid,
  p_cpf_confirmado text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_rede boolean;
  v_m motorista%rowtype;
  v_proprio boolean;
  v_confirmado boolean;
begin
  perform exigir_autenticado();
  v_locadora := minha_locadora();
  if v_locadora is null then
    raise exception 'nenhuma locadora ativa';
  end if;
  select receber_da_rede into v_rede from locadora where id = v_locadora;

  if not existe_visivel_para(p_motorista_id, v_locadora, v_rede) then
    raise exception 'registro nao encontrado';
  end if;

  select * into v_m from motorista where id = p_motorista_id;
  if v_m.id is null then
    raise exception 'registro nao encontrado';
  end if;

  v_proprio := exists (
    select 1 from incidente i
     where i.motorista_id = v_m.id and i.locadora_id = v_locadora
  );

  v_confirmado := p_cpf_confirmado is not null
    and regexp_replace(p_cpf_confirmado, '\D', '', 'g') = v_m.cpf;

  if not v_proprio and not v_confirmado then
    raise exception 'confirme o CPF para abrir a ficha';
  end if;

  return jsonb_build_object(
    'motorista', jsonb_build_object(
      'id', v_m.id,
      'nome_completo', v_m.nome_completo,
      'cpf_mascarado', mascara_cpf(v_m.cpf),
      'nascimento', v_m.nascimento,
      'foto_caminho', v_m.foto_caminho,
      'criado_em', v_m.criado_em
    ),
    'incidentes', coalesce((
      select jsonb_agg(x order by (x->>'criado_em') desc)
        from (
          select jsonb_build_object(
                   'id', i.id,
                   'proprio', i.locadora_id = v_locadora,
                   'locadora_id', i.locadora_id,
                   'locadora_nome', l.nome,
                   'placa', i.placa,
                   'tipo', i.tipo,
                   'valor', i.valor,
                   'descricao', i.descricao,
                   'estado', i.estado,
                   'confianca', i.confianca,
                   'motivo', i.motivo,
                   'criado_em', i.criado_em,
                   'criado_por_nome', p.nome,
                   'anexos', case when i.locadora_id = v_locadora
                                  then coalesce((select jsonb_agg(jsonb_build_object(
                                         'id', a.id, 'caminho', a.caminho, 'bytes', a.bytes)
                                       ) from anexo a where a.incidente_id = i.id), '[]'::jsonb)
                                  else '[]'::jsonb end
                 ) as x
            from incidente i
            join locadora l on l.id = i.locadora_id
            left join perfil p on p.id = i.criado_por
           where i.motorista_id = v_m.id
             and incidente_visivel_para(i.locadora_id, i.estado, i.confianca, v_locadora, v_rede)
        ) sub
    ), '[]'::jsonb)
  );
end;
$$;

-- p_anexos: jsonb array de {"caminho", "content_type", "bytes"} ja enviados
-- para {locadora_id}/rascunho/... Exige de 1 a 6 anexos.
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
    if v_caminho is null or v_caminho not like v_locadora || '/%' then
      raise exception 'anexo fora da pasta da sua locadora';
    end if;
    if exists (select 1 from anexo where caminho = v_caminho) then
      raise exception 'anexo ja vinculado';
    end if;
    insert into anexo (incidente_id, locadora_id, caminho, content_type, bytes)
    values (v_id, v_locadora, v_caminho,
            v_item->>'content_type', nullif(v_item->>'bytes', '')::bigint);
  end loop;

  perform registrar_auditoria(
    v_locadora, 'incidente.criar', 'incidente', v_id, null,
    jsonb_build_object('motorista_id', p_motorista_id, 'tipo', p_tipo,
                       'placa', v_placa, 'estado', 'suspeita', 'anexos', v_qtd)
  );

  return v_id;
end;
$$;

create or replace function listar_incidentes(p_limite int default 50)
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
    select jsonb_agg(x order by (x->>'criado_em') desc)
      from (
        select jsonb_build_object(
                 'id', i.id,
                 'motorista_id', i.motorista_id,
                 'motorista_nome', m.nome_completo,
                 'cpf_mascarado', mascara_cpf(m.cpf),
                 'placa', i.placa,
                 'tipo', i.tipo,
                 'valor', i.valor,
                 'estado', i.estado,
                 'confianca', i.confianca,
                 'criado_em', i.criado_em,
                 'tem_anexo', exists (select 1 from anexo a where a.incidente_id = i.id)
               ) as x
          from incidente i
          join motorista m on m.id = i.motorista_id
         where i.locadora_id = v_locadora
         order by i.criado_em desc
         limit least(greatest(coalesce(p_limite, 50), 1), 200)
      ) sub
  ), '[]'::jsonb);
end;
$$;

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

  update incidente
     set estado = p_novo_estado,
         confianca = coalesce(p_confianca, confianca),
         motivo = btrim(p_motivo),
         atualizado_em = now()
   where id = p_incidente_id;

  perform registrar_auditoria(
    v_inc.locadora_id, 'incidente.' || p_novo_estado, 'incidente', p_incidente_id,
    v_antes, jsonb_build_object('estado', p_novo_estado, 'motivo', p_motivo,
                                'confianca', coalesce(p_confianca, v_inc.confianca))
  );
end;
$$;
