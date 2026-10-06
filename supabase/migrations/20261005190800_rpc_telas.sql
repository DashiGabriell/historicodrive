-- Histórico — 0008 RPCs das telas de detalhe e configuracao

-- Locadora pendente/recusada nao opera: toda RPC de negocio passa por aqui,
-- entao ela recebe 'nenhuma locadora ativa' ate o superadmin aprovar.
create or replace function minha_locadora()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.locadora_ativa
    from perfil p
    join locadora l on l.id = p.locadora_ativa and l.status = 'aprovada'
   where p.id = auth.uid();
$$;

-- tela 9: dados atuais da locadora ativa
create or replace function minha_locadora_dados()
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

  return (
    select jsonb_build_object(
             'id', l.id,
             'nome', l.nome,
             'cnpj', l.cnpj,
             'cidade', l.cidade,
             'uf', l.uf,
             'email_contato', l.email_contato,
             'status', l.status,
             'receber_da_rede', l.receber_da_rede,
             'criado_em', l.criado_em,
             'aprovado_em', l.aprovado_em
           )
      from locadora l
     where l.id = v_locadora
  );
end;
$$;

-- tela 8: so a locadora dona abre o detalhe (anexo nunca cruza a rede)
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
               'content_type', a.content_type, 'bytes', a.bytes
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

revoke execute on function minha_locadora_dados(), detalhe_incidente(uuid) from public, anon;
grant execute on function minha_locadora_dados(), detalhe_incidente(uuid)
to authenticated, service_role;
