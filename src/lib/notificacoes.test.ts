import { describe, expect, it } from "vitest";
import { erroDoComunicado, linkInterno, linkValido } from "./notificacoes";

describe("linkValido", () => {
  it("aceita vazio, caminho do app e https", () => {
    for (const link of ["", "/", "/rascunhos", "/incidente/novo?x=1", "https://historico.app/novidades"]) {
      expect(linkValido(link)).toBe(true);
    }
  });

  it("recusa protocolo perigoso, http e endereço sem barra", () => {
    for (const link of [
      "javascript:alert(1)",
      "//evil.com",
      "http://site.com",
      "rascunhos",
      "https://",
      "https://a b",
      `/${"a".repeat(500)}`,
    ]) {
      expect(linkValido(link)).toBe(false);
    }
  });
});

describe("linkInterno", () => {
  it("separa caminho do app de endereço externo", () => {
    expect(linkInterno("/rascunhos")).toBe(true);
    expect(linkInterno("//evil.com")).toBe(false);
    expect(linkInterno("https://site.com")).toBe(false);
  });
});

describe("erroDoComunicado", () => {
  const base = { titulo: "Nova tela", corpo: "Texto do aviso.", link: "" };

  it("aceita o comunicado completo", () => {
    expect(erroDoComunicado(base)).toBeNull();
    expect(erroDoComunicado({ ...base, link: " /rascunhos " })).toBeNull();
  });

  it("aponta título, texto e link inválidos", () => {
    expect(erroDoComunicado({ ...base, titulo: " ab " })).toMatch(/título/);
    expect(erroDoComunicado({ ...base, titulo: "a".repeat(121) })).toMatch(/título/);
    expect(erroDoComunicado({ ...base, corpo: "   " })).toMatch(/texto/);
    expect(erroDoComunicado({ ...base, link: "javascript:alert(1)" })).toMatch(/Link/);
  });
});
