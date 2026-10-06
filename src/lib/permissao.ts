export type Papel = "superadmin" | "dono";

export type PerfilResumo = {
  papel: Papel;
  locadora_ativa: string | null;
  locadoras?: Array<{ id: string; status: "pendente" | "aprovada" | "recusada" }>;
};

/** publico: acessa sem sessao | login: falta sessao | negado: sessao sem papel
 *  | pendente: dono cuja locadora ativa ainda nao foi aprovada */
export type Acesso = "publico" | "login" | "negado" | "pendente" | "ok";

const PUBLICAS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/redefinir",
  "/styleguide",
  "/termos",
  "/contestar",
];

const ROTAS_LOCADORA = [
  "/painel",
  "/busca",
  "/motorista",
  "/incidente",
  "/rascunhos",
  "/config",
  "/auditoria",
  "/contestacoes",
];

export function acessoPara(caminho: string, perfil: PerfilResumo | null): Acesso {
  const base = "/" + (caminho.split("/")[1] ?? "");

  if (PUBLICAS.includes(base)) return "publico";
  if (!perfil) return "login";

  if (base === "/admin" || base === "/dashitecnology") {
    return perfil.papel === "superadmin" ? "ok" : "negado";
  }

  if (ROTAS_LOCADORA.includes(base)) {
    if (perfil.papel !== "dono" || !perfil.locadora_ativa) return "negado";
    const ativa = perfil.locadoras?.find((l) => l.id === perfil.locadora_ativa);
    return ativa && ativa.status !== "aprovada" ? "pendente" : "ok";
  }

  return "ok";
}

/** rota para onde um usuario recem-logado deve cair */
export function rotaInicial(papel: Papel | null): string {
  return papel === "superadmin" ? "/dashitecnology" : "/painel";
}
