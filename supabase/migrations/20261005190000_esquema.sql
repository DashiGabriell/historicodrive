-- HistóricoDrive — 0001 esquema base
-- Fonte de verdade do domínio: docs/GLOSSARY.md e docs/adr/.
-- Postura: RLS ligado em tudo e nenhum policy de select comum.
-- Leitura/escrita de negocio acontece so via RPC SECURITY DEFINER (ADR 0003).

create type status_locadora as enum ('pendente', 'aprovada', 'recusada');
create type papel_perfil as enum ('superadmin', 'dono');
create type estado_incidente as enum ('suspeita', 'confirmado', 'contestado');
create type confianca_incidente as enum ('baixa', 'media', 'alta');
create type tipo_incidente as enum (
  'dano_veiculo',
  'fraude_documental',
  'nao_devolucao',
  'uso_indevido'
);

create table locadora (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) >= 3),
  cnpj text,
  cidade text,
  uf char(2),
  email_contato text not null,
  status status_locadora not null default 'pendente',
  receber_da_rede boolean not null default true,
  motivo_recusa text,
  criado_por uuid,
  criado_em timestamptz not null default now(),
  aprovado_em timestamptz,
  aprovado_por uuid,
  constraint locadora_cnpj_formato check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  constraint locadora_uf_formato check (uf is null or uf ~ '^[A-Z]{2}$'),
  constraint locadora_recusa_motivo
    check (status <> 'recusada' or motivo_recusa is not null)
);

create unique index locadora_cnpj_uniq on locadora (cnpj) where cnpj is not null;

create table perfil (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel papel_perfil not null default 'dono',
  locadora_ativa uuid,
  criado_em timestamptz not null default now()
);

create table perfil_locadora (
  perfil_id uuid not null references perfil (id) on delete cascade,
  locadora_id uuid not null references locadora (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, locadora_id)
);

-- locadora_ativa so pode apontar para uma locadora da qual o perfil e membro
alter table perfil
  add constraint perfil_locadora_ativa_fk
  foreign key (id, locadora_ativa)
  references perfil_locadora (perfil_id, locadora_id)
  on delete set null;

create table motorista (
  id uuid primary key default gen_random_uuid(),
  cpf text not null,
  nome_completo text not null check (length(btrim(nome_completo)) >= 5),
  nascimento date,
  foto_caminho text,
  criado_em timestamptz not null default now(),
  constraint motorista_cpf_formato check (cpf ~ '^[0-9]{11}$')
);

create unique index motorista_cpf_uniq on motorista (cpf);
create index motorista_nome_idx on motorista (upper(nome_completo));

create table incidente (
  id uuid primary key default gen_random_uuid(),
  motorista_id uuid not null references motorista (id),
  locadora_id uuid not null references locadora (id),
  placa text not null,
  tipo tipo_incidente not null,
  valor numeric(12, 2),
  descricao text not null,
  estado estado_incidente not null default 'suspeita',
  confianca confianca_incidente not null default 'media',
  motivo text,
  criado_por uuid not null references perfil (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint incidente_placa_formato
    check (placa ~ '^[A-Z]{3}-?[0-9]{4}$' or placa ~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$'),
  constraint incidente_descricao_minima check (length(btrim(descricao)) >= 10),
  constraint incidente_valor_positivo check (valor is null or valor >= 0)
);

create index incidente_locadora_em_idx on incidente (locadora_id, criado_em desc);
create index incidente_motorista_em_idx on incidente (motorista_id, criado_em desc);

create table anexo (
  id uuid primary key default gen_random_uuid(),
  incidente_id uuid not null references incidente (id) on delete cascade,
  locadora_id uuid not null references locadora (id),
  caminho text not null,
  content_type text,
  bytes bigint,
  criado_em timestamptz not null default now()
);

create index anexo_incidente_idx on anexo (incidente_id);
create unique index anexo_caminho_uniq on anexo (caminho);
