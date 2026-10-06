import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button, ButtonLink, Card, EmptyState } from "@/ui";
import { acessoPara } from "./permissao";
import { useSessao } from "./sessao-contexto";

export function AcessoNegado() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <Card className="w-full max-w-md">
        <EmptyState
          title="Acesso negado"
          description="Sua conta não tem permissão para esta área. Troque de locadora ou use a conta certa."
          action={<ButtonLink href="/">Voltar para o início</ButtonLink>}
        />
      </Card>
    </div>
  );
}

export function CadastroEmAnalise() {
  const { perfil, sair } = useSessao();
  const ativa = perfil?.locadoras.find((l) => l.id === perfil.locadora_ativa);
  const recusada = ativa?.status === "recusada";

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <Card className="w-full max-w-md">
        <EmptyState
          title={recusada ? "Cadastro recusado" : "Cadastro em análise"}
          description={
            recusada
              ? `O cadastro de ${ativa?.nome ?? "sua locadora"} foi recusado pelo superadmin. Entre em contato para entender o motivo.`
              : `${ativa?.nome ?? "Sua locadora"} aguarda a aprovação do superadmin. Assim que for liberada, as telas de operação aparecem aqui.`
          }
          action={
            <Button variant="outline" onClick={() => void sair()}>
              Sair
            </Button>
          }
        />
      </Card>
    </div>
  );
}

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { carregando, perfil } = useSessao();
  const local = useLocation();
  const acesso = acessoPara(local.pathname, perfil);

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
        <p className="label">Carregando sessão…</p>
      </div>
    );
  }

  if (acesso === "login") {
    return <Navigate to="/login" state={{ de: local.pathname }} replace />;
  }

  if (acesso === "negado") {
    return <AcessoNegado />;
  }

  if (acesso === "pendente") {
    return <CadastroEmAnalise />;
  }

  return <>{children}</>;
}
