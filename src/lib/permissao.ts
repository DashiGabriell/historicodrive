export type Papel = "superadmin" | "dono";

export type PerfilResumo = {
  papel: Papel;
  locadora_ativa: string | null;
};

/** publico: acessa sem sessao | login: falta sessao | negado: sessao sem papel */
export type Acesso = "publico" | "login" | "negado" | "ok";

const PUBLICAS = ["/", "/login", "/esqueci-senha", "/redefinir", "/styleguide"];

const ROTAS_LOCADORA = [
  "/painel",
  "/busca",
  "/motorista",
  "/incidente",
  "/config",
  "/auditoria",
];

export function acessoPara(caminho: string, perfil: PerfilResumo | null): Acesso {
  const base = "/" + (caminho.split("/")[1] ?? "");

  if (PUBLICAS.includes(base)) return "publico";
  if (!perfil) return "login";

  if (base === "/admin") {
    return perfil.papel === "superadmin" ? "ok" : "negado";
  }

  if (ROTAS_LOCADORA.includes(base)) {
    return perfil.papel === "dono" && perfil.locadora_ativa ? "ok" : "negado";
  }

  return "ok";
}

/** rota para onde um usuario recem-logado deve cair */
export function rotaInicial(papel: Papel | null): string {
  return papel === "superadmin" ? "/admin/pendentes" : "/painel";
}
