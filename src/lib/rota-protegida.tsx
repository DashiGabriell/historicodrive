import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ButtonLink, Card, EmptyState } from "@/ui";
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

  return <>{children}</>;
}
