-- Comunicados da plataforma (broadcast do superadmin para os donos de
-- locadoras aprovadas). Uma linha por comunicado; a leitura é por pessoa.
-- Não carregam motorista nem incidente: ficam fora da regra de leitura do titular.

create table comunicado (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('novidade', 'manutencao', 'importante')),
  titulo text not null check (length(btrim(titulo)) between 3 and 120),
  corpo text not null check (length(btrim(corpo)) between 1 and 2000),
  -- caminho interno ("/rascunhos") ou https; nunca "//host" nem javascript:
  link text check (
    link is null
    or (length(link) <= 500 and link ~ '^(/([^/].*)?|https://[^\s]+)$')
  ),
  criado_por uuid not null,
  criado_em timestamptz not null default now(),
  retirado_em timestamptz,
  retirado_por uuid
);

create index comunicado_ativo_idx on comunicado (criado_em desc) where retirado_em is null;

create table comunicado_leitura (
  comunicado_id uuid not null references comunicado (id) on delete cascade,
  perfil_id uuid not null references perfil (id) on delete cascade,
  lido_em timestamptz not null default now(),
  primary key (comunicado_id, perfil_id)
);

create index comunicado_leitura_perfil_idx on comunicado_leitura (perfil_id);

alter table comunicado enable row level security;
alter table comunicado_leitura enable row level security;
revoke all on comunicado from anon, authenticated;
revoke all on comunicado_leitura from anon, authenticated;

-- ------------------------------------------------------------------
-- superadmin
-- ------------------------------------------------------------------
create or replace function publicar_comunicado(
  p_tipo text,
  p_titulo text,
  p_corpo text,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link text := nullif(btrim(coalesce(p_link, '')), '');
  v_id uuid;
begin
  perform exigir_superadmin();

  if p_tipo is null or p_tipo not in ('novidade', 'manutencao', 'importante') then
    raise exception 'tipo de comunicado invalido';
  end if;
  if length(btrim(coalesce(p_titulo, ''))) not between 3 and 120 then
    raise exception 'titulo do comunicado precisa de 3 a 120 caracteres';
  end if;
  if length(btrim(coalesce(p_corpo, ''))) not between 1 and 2000 then
    raise exception 'texto do comunicado precisa de 1 a 2000 caracteres';
  end if;
  if v_link is not null
     and (length(v_link) > 500 or v_link !~ '^(/([^/].*)?|https://[^\s]+)$') then
    raise exception 'link do comunicado invalido';
  end if;

  insert into comunicado (tipo, titulo, corpo, link, criado_por)
  values (p_tipo, btrim(p_titulo), btrim(p_corpo), v_link, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function retirar_comunicado(p_comunicado_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();

  update comunicado
     set retirado_em = now(), retirado_por = auth.uid()
   where id = p_comunicado_id
     and retirado_em is null;

  if not found then
    raise exception 'comunicado nao encontrado ou ja retirado';
  end if;
end;
$$;

-- destinatários = donos com ao menos uma locadora aprovada (quem consegue ler)
create or replace function listar_comunicados_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_superadmin();

  return jsonb_build_object(
    'destinatarios', (
      select count(*)
        from perfil p
       where p.papel = 'dono'
         and exists (
           select 1
             from perfil_locadora pl
             join locadora l on l.id = pl.locadora_id and l.status = 'aprovada'
            where pl.perfil_id = p.id
         )
    ),
    'itens', coalesce((
      select jsonb_agg(item order by item->>'criado_em' desc)
        from (
          select jsonb_build_object(
                   'id', c.id, 'tipo', c.tipo, 'titulo', c.titulo, 'corpo', c.corpo,
                   'link', c.link, 'criado_em', c.criado_em, 'retirado_em', c.retirado_em,
                   'leituras', (select count(*) from comunicado_leitura cl where cl.comunicado_id = c.id)
                 ) as item
            from comunicado c
           order by c.criado_em desc
           limit 50
        ) s
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------------
-- dono (locadora aprovada)
-- ------------------------------------------------------------------
create or replace function listar_comunicados(p_limite int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform exigir_dono();

  return coalesce((
    select jsonb_agg(item order by item->>'criado_em' desc)
      from (
        select jsonb_build_object(
                 'id', c.id, 'tipo', c.tipo, 'titulo', c.titulo, 'corpo', c.corpo,
                 'link', c.link, 'criado_em', c.criado_em,
                 'lido', exists (
                   select 1 from comunicado_leitura cl
                    where cl.comunicado_id = c.id and cl.perfil_id = auth.uid()
                 )
               ) as item
          from comunicado c
         where c.retirado_em is null
         order by c.criado_em desc
         limit least(greatest(coalesce(p_limite, 30), 1), 100)
      ) s
  ), '[]'::jsonb);
end;
$$;

create or replace function marcar_comunicado_lido(p_comunicado_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform exigir_dono();

  insert into comunicado_leitura (comunicado_id, perfil_id)
  select c.id, auth.uid()
    from comunicado c
   where c.id = p_comunicado_id
     and c.retirado_em is null
  on conflict do nothing;
end;
$$;

-- alertas são da locadora; comunicados, da pessoa
create or replace function marcar_tudo_lido()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform exigir_dono();

  update notificacao
     set lida_em = now()
   where locadora_id = minha_locadora()
     and lida_em is null;

  insert into comunicado_leitura (comunicado_id, perfil_id)
  select c.id, auth.uid()
    from comunicado c
   where c.retirado_em is null
  on conflict do nothing;
end;
$$;

create or replace function contar_nao_lidas()
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

  return jsonb_build_object(
    'alertas', (
      select count(*) from notificacao n
       where n.locadora_id = v_locadora and n.lida_em is null
    ),
    'novidades', (
      select count(*) from comunicado c
       where c.retirado_em is null
         and not exists (
           select 1 from comunicado_leitura cl
            where cl.comunicado_id = c.id and cl.perfil_id = auth.uid()
         )
    )
  );
end;
$$;

-- o limit ficava fora da agregação e não cortava nada
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
    select jsonb_agg(item order by item->>'criado_em' desc)
      from (
        select jsonb_build_object(
                 'id', n.id, 'tipo', n.tipo, 'titulo', n.titulo, 'corpo', n.corpo,
                 'incidente_id', n.incidente_id, 'lida', n.lida_em is not null,
                 'criado_em', n.criado_em
               ) as item
          from notificacao n
         where n.locadora_id = v_locadora
         order by n.criado_em desc
         limit least(greatest(coalesce(p_limite, 20), 1), 100)
      ) s
  ), '[]'::jsonb);
end;
$$;

-- ------------------------------------------------------------------
-- superfície
-- ------------------------------------------------------------------
revoke execute on function
  publicar_comunicado(text, text, text, text),
  retirar_comunicado(uuid),
  listar_comunicados_admin(),
  listar_comunicados(int),
  marcar_comunicado_lido(uuid),
  marcar_tudo_lido(),
  contar_nao_lidas(),
  listar_notificacoes(int)
from public, anon, authenticated;

grant execute on function
  publicar_comunicado(text, text, text, text),
  retirar_comunicado(uuid),
  listar_comunicados_admin(),
  listar_comunicados(int),
  marcar_comunicado_lido(uuid),
  marcar_tudo_lido(),
  contar_nao_lidas(),
  listar_notificacoes(int)
to authenticated;

grant execute on function
  publicar_comunicado(text, text, text, text),
  retirar_comunicado(uuid),
  listar_comunicados_admin(),
  listar_comunicados(int),
  marcar_comunicado_lido(uuid),
  marcar_tudo_lido(),
  contar_nao_lidas(),
  listar_notificacoes(int)
to service_role;
