import { describe, expect, it } from "vitest";
import { acessoPara, rotaInicial, type PerfilResumo } from "./permissao";

const dono: PerfilResumo = {
  papel: "dono",
  locadora_ativa: "11111111-1111-1111-1111-111111111111",
};
const donoSemLocadora: PerfilResumo = { papel: "dono", locadora_ativa: null };
const superadmin: PerfilResumo = { papel: "superadmin", locadora_ativa: null };

describe("acessoPara", () => {
  it("deixa as rotas publicas abertas sem sessao", () => {
    for (const rota of [
      "/",
      "/login",
      "/cadastro",
      "/esqueci-senha",
      "/redefinir",
      "/styleguide",
    ]) {
      expect(acessoPara(rota, null)).toBe("publico");
    }
  });

  it("manda para o login quando nao ha sessao", () => {
    for (const rota of ["/painel", "/busca", "/incidente/novo", "/admin/pendentes"]) {
      expect(acessoPara(rota, null)).toBe("login");
    }
  });

  it("libera as rotas da locadora para o dono com locadora ativa", () => {
    for (const rota of [
      "/painel",
      "/busca",
      "/motorista/abc",
      "/config",
      "/auditoria",
    ]) {
      expect(acessoPara(rota, dono)).toBe("ok");
    }
    expect(acessoPara("/incidente/novo", dono)).toBe("ok");
    expect(acessoPara("/incidente/123", dono)).toBe("ok");
    expect(acessoPara("/rascunhos", dono)).toBe("ok");
  });

  it("segura o dono sem locadora ativa", () => {
    expect(acessoPara("/painel", donoSemLocadora)).toBe("negado");
    expect(acessoPara("/incidente/novo", donoSemLocadora)).toBe("negado");
    expect(acessoPara("/rascunhos", donoSemLocadora)).toBe("negado");
  });

  it("segura o dono cuja locadora ativa ainda nao foi aprovada", () => {
    const pendente: PerfilResumo = {
      ...dono,
      locadoras: [{ id: dono.locadora_ativa!, status: "pendente" }],
    };
    const aprovada: PerfilResumo = {
      ...dono,
      locadoras: [{ id: dono.locadora_ativa!, status: "aprovada" }],
    };
    expect(acessoPara("/painel", pendente)).toBe("pendente");
    expect(acessoPara("/busca", pendente)).toBe("pendente");
    expect(acessoPara("/painel", aprovada)).toBe("ok");
  });

  it("impede o dono de chegar no /admin", () => {
    expect(acessoPara("/admin/pendentes", dono)).toBe("negado");
  });

  it("impede o superadmin de usar as telas da locadora (vice-versa)", () => {
    for (const rota of ["/painel", "/busca", "/config", "/incidente/novo"]) {
      expect(acessoPara(rota, superadmin)).toBe("negado");
    }
    expect(acessoPara("/admin/pendentes", superadmin)).toBe("ok");
  });
});

describe("rotaInicial", () => {
  it("leva o superadmin para a fila e o dono para o painel", () => {
    expect(rotaInicial("superadmin")).toBe("/admin/pendentes");
    expect(rotaInicial("dono")).toBe("/painel");
  });
});
