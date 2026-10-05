-- HistóricoDrive — 0005 RPCs de painel e auditoria

create or replace function painel_kpis(p_de date, p_ate date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_locadora uuid;
  v_de date;
  v_ate date;
begin
  perform exigir_dono();
  v_locadora := minha_locadora();

  v_de := coalesce(p_de, (current_date - interval '12 months'))::date;
  v_ate := coalesce(p_ate, current_date)::date;
  if v_de > v_ate then
    raise exception 'periodo invalido';
  end if;

  return jsonb_build_object(
    'periodo', jsonb_build_object('de', v_de, 'ate', v_ate),
    'prejuizo_acumulado', coalesce((
      select sum(i.valor) from incidente i
       where i.locadora_id = v_locadora and i.valor is not null
    ), 0),
    'prejuizo_periodo', coalesce((
      select sum(i.valor) from incidente i
       where i.locadora_id = v_locadora
         and i.criado_em::date between v_de and v_ate
         and i.valor is not null
    ), 0),
    'incidentes_periodo', coalesce((
      select count(*) from incidente i
       where i.locadora_id = v_locadora
         and i.criado_em::date between v_de and v_ate
    ), 0),
    'por_tipo', coalesce((
      select jsonb_object_agg(tipo, qtd) from (
        select i.tipo, count(*)::int as qtd
          from incidente i
         where i.locadora_id = v_locadora
           and i.criado_em::date between v_de and v_ate
         group by i.tipo
      ) t
    ), '{}'::jsonb),
    'por_estado', coalesce((
      select jsonb_object_agg(estado, qtd) from (
        select i.estado, count(*)::int as qtd
          from incidente i
         where i.locadora_id = v_locadora
           and i.criado_em::date between v_de and v_ate
         group by i.estado
      ) t
    ), '{}'::jsonb),
    'por_mes', coalesce((
      select jsonb_agg(jsonb_build_object('mes', mes, 'total', qtd)
                       order by mes)
        from (
          select to_char(i.criado_em, 'YYYY-MM') as mes, count(*)::int as qtd
            from incidente i
           where i.locadora_id = v_locadora
             and i.criado_em::date between v_de and v_ate
           group by 1
        ) t
    ), '[]'::jsonb),
    'top_placas', coalesce((
      select jsonb_agg(jsonb_build_object('placa', placa, 'total', qtd)
                       order by qtd desc, placa)
        from (
          select i.placa, count(*)::int as qtd
            from incidente i
           where i.locadora_id = v_locadora
             and i.criado_em::date between v_de and v_ate
           group by i.placa
           order by 2 desc
           limit 5
        ) t
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function listar_auditoria(
  p_limite int default 50,
  p_offset int default 0
)
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
                 'id', a.id,
                 'acao', a.acao,
                 'alvo_tipo', a.alvo_tipo,
                 'alvo_id', a.alvo_id,
                 'ator_nome', p.nome,
                 'antes', a.antes,
                 'depois', a.depois,
                 'criado_em', a.criado_em
               ) as x
          from audit_log a
          left join perfil p on p.id = a.ator
         where a.locadora_id = v_locadora
         order by a.id desc
         limit least(greatest(coalesce(p_limite, 50), 1), 200)
         offset greatest(coalesce(p_offset, 0), 0)
      ) sub
  ), '[]'::jsonb);
end;
$$;
