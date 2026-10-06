import { describe, expect, it } from "vitest";
import {
  centavosDeTexto,
  cpfValido,
  cruzaARede,
  erroDoValor,
  formatarCentavos,
  formatarCnpj,
  formatarCpf,
  iniciais,
  mascararPlaca,
  placaCompleta,
  placaValida,
  reaisDeCentavos,
  transicoesPermitidas,
} from "./dominio";

describe("mascararPlaca", () => {
  it("trava em 7 caracteres", () => {
    expect(mascararPlaca("ABC12345678")).toBe("ABC1234");
    expect(mascararPlaca("abc1d239")).toBe("ABC1D23");
  });

  it("descarta hífen, espaço e o que não cabe na posição", () => {
    expect(mascararPlaca("ABC-1234")).toBe("ABC1234");
    expect(mascararPlaca("abc 1d23")).toBe("ABC1D23");
    expect(mascararPlaca("1AB2C")).toBe("ABC");
    expect(mascararPlaca("ABCD")).toBe("ABC");
  });
});

describe("placaCompleta", () => {
  it("exige exatamente 7 caracteres válidos", () => {
    expect(placaCompleta("ABC1234")).toBe(true);
    expect(placaCompleta("ABC1D23")).toBe(true);
    expect(placaCompleta("ABC123")).toBe(false);
    expect(placaCompleta("ABC-1234")).toBe(false);
    expect(placaCompleta("")).toBe(false);
  });
});

describe("valor em centavos", () => {
  it("lê a digitação só com dígitos, sem zeros à esquerda", () => {
    expect(centavosDeTexto("1.500,00")).toBe("150000");
    expect(centavosDeTexto("0,05")).toBe("5");
    expect(centavosDeTexto("0,00")).toBe("");
    expect(centavosDeTexto("abc")).toBe("");
    expect(centavosDeTexto("123456789012345")).toBe("1234567890");
  });

  it("formata com duas casas decimais no padrão brasileiro", () => {
    expect(formatarCentavos("")).toBe("");
    expect(formatarCentavos("5")).toBe("0,05");
    expect(formatarCentavos("150000")).toBe("1.500,00");
    expect(formatarCentavos("9999999999")).toBe("99.999.999,99");
  });

  it("converte para reais e mantém vazio como null", () => {
    expect(reaisDeCentavos("")).toBeNull();
    expect(reaisDeCentavos("150050")).toBe(1500.5);
  });

  it("aceita vazio e recusa zero, lixo e acima do limite", () => {
    expect(erroDoValor("")).toBeNull();
    expect(erroDoValor("150000")).toBeNull();
    expect(erroDoValor("0")).toMatch(/maior que zero/);
    expect(erroDoValor("12a")).toBe("Valor inválido.");
    expect(erroDoValor("10000000000")).toMatch(/limite/);
  });
});

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
