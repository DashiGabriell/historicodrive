// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apagarRascunho,
  chaveRascunho,
  lerRascunho,
  limparRascunhos,
  listarRascunhos,
  novoIdRascunho,
  salvarRascunho,
} from "./rascunho";

describe("rascunhos do incidente", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("guarda em sessionStorage, nunca em localStorage", () => {
    salvarRascunho("loc-a", "r1", { cpf: "529.982.247-25" });
    expect(sessionStorage.getItem(chaveRascunho("loc-a"))).toContain("529.982.247-25");
    expect(localStorage.getItem(chaveRascunho("loc-a"))).toBeNull();
    expect(lerRascunho("loc-a", "r1")).toEqual({ cpf: "529.982.247-25" });
  });

  it("gera ids distintos", () => {
    expect(novoIdRascunho()).not.toBe(novoIdRascunho());
  });

  it("mantém vários rascunhos por locadora e atualiza no lugar", () => {
    salvarRascunho("loc-a", "r1", { x: 1 });
    salvarRascunho("loc-a", "r2", { x: 2 });
    salvarRascunho("loc-a", "r1", { x: 3 });
    expect(listarRascunhos("loc-a")).toHaveLength(2);
    expect(lerRascunho("loc-a", "r1")).toEqual({ x: 3 });
    expect(lerRascunho("loc-a", "r2")).toEqual({ x: 2 });
  });

  it("lista o mais recente primeiro", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T10:00:00Z"));
    salvarRascunho("loc-a", "antigo", { x: 1 });
    vi.setSystemTime(new Date("2026-10-05T11:00:00Z"));
    salvarRascunho("loc-a", "novo", { x: 2 });
    expect(listarRascunhos("loc-a").map((r) => r.id)).toEqual(["novo", "antigo"]);
  });

  it("devolve null para id inexistente", () => {
    expect(lerRascunho("loc-a", "nada")).toBeNull();
  });

  it("descarta o rascunho legado do localStorage ao ler", () => {
    localStorage.setItem(chaveRascunho("loc-a"), JSON.stringify({ cpf: "antigo" }));
    expect(listarRascunhos("loc-a")).toEqual([]);
    expect(localStorage.getItem(chaveRascunho("loc-a"))).toBeNull();
  });

  it("converte o formato antigo (um objeto solto) em um item com id estável", () => {
    sessionStorage.setItem(chaveRascunho("loc-a"), JSON.stringify({ cpf: "123" }));
    const primeira = listarRascunhos("loc-a");
    expect(primeira).toHaveLength(1);
    expect(primeira[0].dados).toEqual({ cpf: "123" });
    expect(listarRascunhos("loc-a")[0].id).toBe(primeira[0].id);
  });

  it("lê JSON corrompido como vazio", () => {
    sessionStorage.setItem(chaveRascunho("loc-a"), "{quebrado");
    expect(listarRascunhos("loc-a")).toEqual([]);
  });

  it("ignora itens malformados", () => {
    sessionStorage.setItem(
      chaveRascunho("loc-a"),
      JSON.stringify({
        versao: 2,
        itens: [{ id: "ok", atualizadoEm: "2026-10-05T10:00:00Z", dados: {} }, { id: 5 }, null],
      }),
    );
    expect(listarRascunhos("loc-a").map((r) => r.id)).toEqual(["ok"]);
  });

  it("apaga só o rascunho pedido e remove a chave quando esvazia", () => {
    salvarRascunho("loc-a", "r1", { x: 1 });
    salvarRascunho("loc-a", "r2", { x: 2 });
    salvarRascunho("loc-b", "r3", { x: 3 });
    apagarRascunho("loc-a", "r1");
    expect(lerRascunho("loc-a", "r1")).toBeNull();
    expect(lerRascunho("loc-a", "r2")).toEqual({ x: 2 });
    expect(lerRascunho("loc-b", "r3")).toEqual({ x: 3 });
    apagarRascunho("loc-a", "r2");
    expect(sessionStorage.getItem(chaveRascunho("loc-a"))).toBeNull();
  });

  it("limpa todos os rascunhos no logout e preserva o resto", () => {
    salvarRascunho("loc-a", "r1", { x: 1 });
    salvarRascunho("loc-b", "r2", { x: 2 });
    localStorage.setItem(chaveRascunho("loc-c"), "{}");
    localStorage.setItem("hd.sessao.inicio", "123");

    limparRascunhos();

    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem(chaveRascunho("loc-c"))).toBeNull();
    expect(localStorage.getItem("hd.sessao.inicio")).toBe("123");
  });
});
