-- Historico — console do operador (superadmin).
-- Contagens e cadastro de locadora/conta. Nao devolve linha de motorista nem incidente.

create table operador_log (
  id bigint generated always as identity primary key,
  ator uuid not null,
  acao text not null,
  alvo_tipo text not null,
  alvo_id uuid,
  detalhe jsonb,
  criado_em timestamptz not null default now()
);

alter table operador_log enable row level security;
revoke all on operador_log from public, anon, authenticated;

create or replace function operador_log_bloquear_mutacao()
returns trigger
language plpgsql
as $$
begin
  raise exception 'operador_log e append-only: % nao permitido', tg_op;
end;
$$;

create trigger operador_log_sem_mutacao
  before update or delete on operador_log
  for each row execute function operador_log_bloquear_mutacao();

create or replace function operador_visao()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();
  return jsonb_build_object(
    'locadoras_pendentes', (select count(*)::int from locadora where status = 'pendente'),
    'locadoras_aprovadas', (select count(*)::int from locadora where status = 'aprovada'),
    'locadoras_recusadas', (select count(*)::int from locadora where status = 'recusada'),
    'contas_dono', (select count(*)::int from perfil where papel = 'dono'),
    'contas_superadmin', (select count(*)::int from perfil where papel = 'superadmin'),
    'recursos_vencidos', (
      select count(*)::int from contestacao
       where estado = 'aberta' and prazo_locadora_em < now()
    ),
    'suspeitas_elegiveis', (
      select count(*)::int from incidente i
       where i.estado = 'suspeita'
         and i.criado_em < now() - interval '30 days'
         and not exists (select 1 from contestacao c where c.incidente_id = i.id)
    ),
    'fila_descarte', (select count(*)::int from anexo_descarte)
  );
end;
$$;

create or replace function operador_listar_locadoras()
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
             'id', l.id,
             'nome', l.nome,
             'cnpj', l.cnpj,
             'cidade', l.cidade,
             'uf', l.uf,
             'email_contato', l.email_contato,
             'status', l.status,
             'receber_da_rede', l.receber_da_rede,
             'motivo_recusa', l.motivo_recusa,
             'criado_em', l.criado_em,
             'aprovado_em', l.aprovado_em,
             'membros', (
               select count(*)::int from perfil_locadora pl where pl.locadora_id = l.id
             )
           ) order by l.criado_em desc)
      from locadora l
  ), '[]'::jsonb);
end;
$$;

create or replace function operador_listar_contas()
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
             'id', p.id,
             'nome', p.nome,
             'papel', p.papel,
             'email', u.email,
             'criado_em', p.criado_em,
             'locadoras', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', l.id, 'nome', l.nome, 'status', l.status
                      ) order by l.nome)
                 from perfil_locadora pl
                 join locadora l on l.id = pl.locadora_id
                where pl.perfil_id = p.id
             ), '[]'::jsonb)
           ) order by p.nome)
      from perfil p
      left join auth.users u on u.id = p.id
  ), '[]'::jsonb);
end;
$$;

create or replace function operador_definir_papel(p_perfil_id uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual papel_perfil;
  v_nome text;
  v_superadmins int;
begin
  perform exigir_superadmin();

  if p_papel not in ('dono', 'superadmin') then
    raise exception 'papel invalido';
  end if;
  if p_perfil_id = auth.uid() then
    raise exception 'nao altera o proprio papel';
  end if;

  select papel, nome into v_atual, v_nome from perfil where id = p_perfil_id;
  if v_atual is null then
    raise exception 'perfil nao encontrado';
  end if;
  if v_atual::text = p_papel then
    return;
  end if;

  if v_atual = 'superadmin' and p_papel = 'dono' then
    select count(*) into v_superadmins from perfil where papel = 'superadmin';
    if v_superadmins <= 1 then
      raise exception 'ultimo superadmin';
    end if;
  end if;

  update perfil set papel = p_papel::papel_perfil where id = p_perfil_id;

  insert into operador_log (ator, acao, alvo_tipo, alvo_id, detalhe)
  values (
    auth.uid(),
    'conta.papel',
    'conta',
    p_perfil_id,
    jsonb_build_object(
      'resumo', v_nome || ': de ' || v_atual::text || ' para ' || p_papel,
      'de', v_atual::text,
      'para', p_papel
    )
  );
end;
$$;

create or replace function operador_retencao()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();
  return jsonb_build_object(
    'suspeitas_elegiveis', (
      select count(*)::int from incidente i
       where i.estado = 'suspeita'
         and i.criado_em < now() - interval '30 days'
         and not exists (select 1 from contestacao c where c.incidente_id = i.id)
    ),
    'fila_descarte', (select count(*)::int from anexo_descarte),
    'fila_com_falha', (select count(*)::int from anexo_descarte where tentativas > 0),
    'recursos_vencidos', (
      select count(*)::int from contestacao
       where estado = 'aberta' and prazo_locadora_em < now()
    )
  );
end;
$$;

-- so o total sai; a funcao interna continua fechada para o cliente
create or replace function operador_expurgar_suspeitas(p_dias int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  perform exigir_superadmin();
  v_total := expurgar_suspeitas(p_dias);
  insert into operador_log (ator, acao, alvo_tipo, detalhe)
  values (
    auth.uid(),
    'retencao.suspeitas',
    'retencao',
    jsonb_build_object(
      'resumo', v_total || ' suspeita(s) expurgada(s)',
      'total', v_total
    )
  );
  return v_total;
end;
$$;

create or replace function operador_trilha(p_limite int default 80)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limite int := least(greatest(coalesce(p_limite, 80), 1), 200);
begin
  perform exigir_superadmin();
  return coalesce((
    select jsonb_agg(x.item order by x.quando desc)
      from (
        select u.quando, u.item
          from (
            select a.criado_em as quando,
                   jsonb_build_object(
                     'id', 'audit-' || a.id::text,
                     'quando', a.criado_em,
                     'acao', a.acao,
                     'alvo', 'Locadora',
                     'quem', coalesce(pf.nome, 'Sistema'),
                     'onde', l.nome,
                     'resumo', coalesce(nullif(a.depois->>'status', ''), a.acao)
                   ) as item
              from audit_log a
              join locadora l on l.id = a.locadora_id
              left join perfil pf on pf.id = a.ator
             where a.alvo_tipo = 'locadora'
            union all
            select a.criado_em,
                   jsonb_build_object(
                     'id', 'contestacao-' || a.id::text,
                     'quando', a.criado_em,
                     'acao', a.acao,
                     'alvo', 'Contestacao',
                     'quem', coalesce(pf.nome, 'Sistema'),
                     'onde', l.nome,
                     'resumo', coalesce(nullif(a.depois->>'estado', ''), a.acao)
                   )
              from audit_log a
              join locadora l on l.id = a.locadora_id
              left join perfil pf on pf.id = a.ator
             where a.alvo_tipo = 'contestacao'
            union all
            select o.criado_em,
                   jsonb_build_object(
                     'id', 'operador-' || o.id::text,
                     'quando', o.criado_em,
                     'acao', o.acao,
                     'alvo', case when o.alvo_tipo = 'conta' then 'Conta' else 'Retencao' end,
                     'quem', coalesce(pf.nome, 'Sistema'),
                     'onde', 'Plataforma',
                     'resumo', coalesce(o.detalhe->>'resumo', o.acao)
                   )
              from operador_log o
              left join perfil pf on pf.id = o.ator
          ) u
         order by u.quando desc
         limit v_limite
      ) x
  ), '[]'::jsonb);
end;
$$;

revoke execute on function operador_log_bloquear_mutacao() from public, anon, authenticated;

revoke execute on function
  operador_visao(),
  operador_listar_locadoras(),
  operador_listar_contas(),
  operador_definir_papel(uuid, text),
  operador_retencao(),
  operador_expurgar_suspeitas(int),
  operador_trilha(int)
from public, anon;

grant execute on function
  operador_visao(),
  operador_listar_locadoras(),
  operador_listar_contas(),
  operador_definir_papel(uuid, text),
  operador_retencao(),
  operador_expurgar_suspeitas(int),
  operador_trilha(int)
to authenticated, service_role;
