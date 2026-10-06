-- criar_incidente falhava em todo envio: o alias "v_item" da subconsulta da
-- auditoria colidia com a variável v_item ("column reference is ambiguous").
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
                         select jsonb_agg(lower(elem->>'hash'))
                           from jsonb_array_elements(p_anexos) as a(elem)
                       ))
  );

  return v_id;
end;
$$;

revoke execute on function
  criar_incidente(uuid, text, tipo_incidente, text, numeric, confianca_incidente, jsonb)
from public, anon, authenticated;

grant execute on function
  criar_incidente(uuid, text, tipo_incidente, text, numeric, confianca_incidente, jsonb)
to authenticated;
