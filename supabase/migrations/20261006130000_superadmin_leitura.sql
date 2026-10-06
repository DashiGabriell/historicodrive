-- Histórico — 0010 bloqueio de leitura do superadmin (T02 defesa legal)
-- superadmin nao le motorista/incidente/busca/ficha (ADR 0004, Q8=B, Q16).
-- Falha no banco, nao so na UI.

create or replace function exigir_leitura_titular()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_autenticado();
  if meu_papel() = 'superadmin' then
    raise exception 'acesso negado: superadmin nao le motorista ou incidente';
  end if;
  if minha_locadora() is null then
    raise exception 'nenhuma locadora ativa';
  end if;
end;
$$;

revoke execute on function exigir_leitura_titular() from public, anon;

-- volativeis: gravam consulta_log (prova de acesso)
create or replace function buscar_motorista(p_termo text)
returns table (
  motorista_id uuid,
  nome_completo text,
  foto_caminho text,
  cpf_mascarado text,
  precisa_confirmar boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_rede boolean;
  v_digitos text;
begin
  perform exigir_leitura_titular();
  v_locadora := minha_locadora();
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

    insert into consulta_log (perfil_id, locadora_id, motorista_id)
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
           v_locadora, m.id
      from motorista m
     where m.cpf = v_digitos
       and existe_visivel_para(m.id, v_locadora, v_rede);
  else
    return query
      select m.id, m.nome_completo, m.foto_caminho, mascara_cpf(m.cpf), true
        from motorista m
       where upper(m.nome_completo) = upper(btrim(p_termo))
         and existe_visivel_para(m.id, v_locadora, v_rede)
       limit 25;

    insert into consulta_log (perfil_id, locadora_id, motorista_id)
    select coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
           v_locadora, m.id
      from motorista m
     where upper(m.nome_completo) = upper(btrim(p_termo))
       and existe_visivel_para(m.id, v_locadora, v_rede)
     limit 25;
  end if;
end;
$$;

create or replace function abrir_ficha(
  p_motorista_id uuid,
  p_cpf_confirmado text default null
)
returns jsonb
language plpgsql
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
  perform exigir_leitura_titular();
  v_locadora := minha_locadora();
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

  perform registrar_consulta(v_locadora, v_m.id);

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
