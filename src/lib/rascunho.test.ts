// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  apagarRascunho,
  chaveRascunho,
  lerRascunho,
  limparRascunhos,
  salvarRascunho,
} from "./rascunho";

describe("rascunho do incidente", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("guarda em sessionStorage, nunca em localStorage", () => {
    salvarRascunho("loc-a", { cpf: "529.982.247-25" });
    expect(sessionStorage.getItem(chaveRascunho("loc-a"))).toContain("529.982.247-25");
    expect(localStorage.getItem(chaveRascunho("loc-a"))).toBeNull();
    expect(lerRascunho("loc-a")).toEqual({ cpf: "529.982.247-25" });
  });

  it("descarta o rascunho legado do localStorage ao ler", () => {
    localStorage.setItem(chaveRascunho("loc-a"), JSON.stringify({ cpf: "antigo" }));
    expect(lerRascunho("loc-a")).toEqual({});
    expect(localStorage.getItem(chaveRascunho("loc-a"))).toBeNull();
  });

  it("lê JSON corrompido como vazio", () => {
    sessionStorage.setItem(chaveRascunho("loc-a"), "{quebrado");
    expect(lerRascunho("loc-a")).toEqual({});
  });

  it("apaga só a locadora pedida", () => {
    salvarRascunho("loc-a", { x: 1 });
    salvarRascunho("loc-b", { x: 2 });
    apagarRascunho("loc-a");
    expect(lerRascunho("loc-a")).toEqual({});
    expect(lerRascunho("loc-b")).toEqual({ x: 2 });
  });

  it("limpa todos os rascunhos no logout e preserva o resto", () => {
    salvarRascunho("loc-a", { x: 1 });
    salvarRascunho("loc-b", { x: 2 });
    localStorage.setItem(chaveRascunho("loc-c"), "{}");
    localStorage.setItem("hd.sessao.inicio", "123");

    limparRascunhos();

    expect(sessionStorage.length).toBe(0);
    expect(localStorage.getItem(chaveRascunho("loc-c"))).toBeNull();
    expect(localStorage.getItem("hd.sessao.inicio")).toBe("123");
  });
});
