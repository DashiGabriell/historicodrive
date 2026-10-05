import type { ReactNode } from "react";
import { useTitulo } from "@/lib/use-titulo";
import { ButtonLink, EmptyState } from "@/ui";

function TelaEmConstrucao({
  titulo,
  descricao,
  ticket,
  volta = "/",
}: {
  titulo: string;
  descricao: ReactNode;
  ticket: string;
  volta?: string;
}) {
  useTitulo(`${titulo} · HistóricoDrive`);

  return (
    <div className="container flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <EmptyState
          title={titulo}
          description={
            <>
              {descricao} Esta tela entra no <strong>{ticket}</strong>.
            </>
          }
          action={
            <ButtonLink href={volta} variant="outline">
              Voltar
            </ButtonLink>
          }
        />
      </div>
    </div>
  );
}

export function Painel() {
  return (
    <TelaEmConstrucao
      titulo="Painel da locadora"
      descricao="KPIs da própria locadora, sem exportação."
      ticket="T12"
      volta="/"
    />
  );
}

export function Busca() {
  return (
    <TelaEmConstrucao
      titulo="Busca no balcão"
      descricao="Procurar motorista por nome completo ou CPF."
      ticket="T10"
      volta="/painel"
    />
  );
}

export function Motorista() {
  return (
    <TelaEmConstrucao
      titulo="Ficha do motorista"
      descricao="Incidentes que a rede pode ver e o que só a sua locadora enxerga."
      ticket="T10"
      volta="/busca"
    />
  );
}

export function IncidenteNovo() {
  return (
    <TelaEmConstrucao
      titulo="Abrir incidente"
      descricao="Formulário em 2 passos, com fotos primeiro e rascunho local."
      ticket="T08 / T09"
      volta="/painel"
    />
  );
}

export function Incidente() {
  return (
    <TelaEmConstrucao
      titulo="Detalhe do incidente"
      descricao="Anexos, mudança de estado com motivo obrigatório e trilha de auditoria."
      ticket="T11"
      volta="/painel"
    />
  );
}

export function Configuracoes() {
  return (
    <TelaEmConstrucao
      titulo="Configurações da locadora"
      descricao="Quem recebe dados da rede e quem tem acesso."
      ticket="T07"
      volta="/painel"
    />
  );
}

export function Auditoria() {
  return (
    <TelaEmConstrucao
      titulo="Auditoria"
      descricao="Registro append-only de tudo o que mudou."
      ticket="T13"
      volta="/painel"
    />
  );
}

export function FilaAdmin() {
  return (
    <TelaEmConstrucao
      titulo="Fila de aprovação"
      descricao="Locadoras aguardando liberação do superadmin."
      ticket="T06"
      volta="/"
    />
  );
}
