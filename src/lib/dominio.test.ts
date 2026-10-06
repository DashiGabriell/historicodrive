import { describe, expect, it } from "vitest";
import {
  cpfValido,
  cruzaARede,
  formatarCnpj,
  formatarCpf,
  iniciais,
  placaValida,
  transicoesPermitidas,
} from "./dominio";

describe("placaValida", () => {
  it("aceita o formato antigo e o Mercosul", () => {
    for (const placa of ["ABC-1234", "ABC1234", "abc1d23", "ABC 1D23"]) {
      expect(placaValida(placa)).toBe(true);
    }
  });

  it("recusa o resto", () => {
    for (const placa of ["AB-1234", "ABCD123", "ABC1DD3", "1234ABC", ""]) {
      expect(placaValida(placa)).toBe(false);
    }
  });
});

describe("cpfValido", () => {
  it("confere os digitos verificadores", () => {
    expect(cpfValido("390.533.447-05")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("52998224726")).toBe(false);
  });

  it("recusa tamanho errado e digitos repetidos", () => {
    expect(cpfValido("1234567890")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
  });
});

describe("maquina de estados do incidente", () => {
  it("suspeita vai para confirmado ou contestado", () => {
    expect(transicoesPermitidas("suspeita")).toEqual(["confirmado", "contestado"]);
  });

  it("nada volta para suspeita", () => {
    expect(transicoesPermitidas("confirmado")).not.toContain("suspeita");
    expect(transicoesPermitidas("contestado")).not.toContain("suspeita");
  });

  it("confirmado e contestado se alternam", () => {
    expect(transicoesPermitidas("confirmado")).toEqual(["contestado"]);
    expect(transicoesPermitidas("contestado")).toEqual(["confirmado"]);
  });
});

describe("cruzaARede (ADR 0001)", () => {
  it("so confirmado com confianca alta cruza", () => {
    expect(cruzaARede("confirmado", "alta")).toBe(true);
    expect(cruzaARede("confirmado", "media")).toBe(false);
    expect(cruzaARede("suspeita", "alta")).toBe(false);
    expect(cruzaARede("contestado", "alta")).toBe(false);
  });
});

describe("formatadores", () => {
  it("mascara CPF e CNPJ enquanto digita", () => {
    expect(formatarCpf("39053344705")).toBe("390.533.447-05");
    expect(formatarCpf("3905")).toBe("390.5");
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarCnpj(null)).toBe("—");
  });

  it("gera iniciais do primeiro e do ultimo nome", () => {
    expect(iniciais("Joana Pereira da Silva")).toBe("JS");
    expect(iniciais("Joana")).toBe("J");
  });
});
