// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { salvarRascunho, listarRascunhos } from "@/lib/rascunho";
import { CtxSessao, type ContextoSessao } from "@/lib/sessao-contexto";
import Rascunhos from "./rascunhos";

const removerAnexo = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/lib/anexos", async (original) => ({
  ...(await original<typeof import("@/lib/anexos")>()),
  removerAnexo,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sessao = {
  carregando: false,
  usuario: null,
  perfil: { id: "u1", nome: "Dono", papel: "dono", locadora_ativa: "loc-a", locadoras: [] },
} as unknown as ContextoSessao;

const anexo = {
  caminho: "loc-a/foto.jpg",
  content_type: "image/jpeg",
  bytes: 10,
  nome: "foto.jpg",
  hash: "b".repeat(64),
};

let raiz: Root | null = null;
let div: HTMLDivElement | null = null;

async function montar() {
  div = document.createElement("div");
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () =>
    raiz?.render(
      <MemoryRouter>
        <CtxSessao.Provider value={sessao}>
          <Rascunhos />
        </CtxSessao.Provider>
      </MemoryRouter>,
    ),
  );
  return div;
}

function botao(container: HTMLElement, texto: string) {
  const achado = [...container.querySelectorAll("button")].find((b) => b.textContent === texto);
  if (!achado) throw new Error(`botão "${texto}" não encontrado`);
  return achado;
}

beforeEach(() => {
  sessionStorage.clear();
  removerAnexo.mockClear();
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  div?.remove();
  raiz = null;
});

describe("página de rascunhos", () => {
  it("mostra o estado vazio", async () => {
    const tela = await montar();
    expect(tela.textContent).toContain("Nenhum rascunho");
  });

  it("lista o rascunho com pendências e link para continuar", async () => {
    salvarRascunho("loc-a", "r1", {
      nome: "Maria da Silva",
      placa: "ABC12",
      valorCentavos: "150000",
      anexos: [anexo],
    });
    const tela = await montar();
    expect(tela.textContent).toContain("Maria da Silva");
    expect(tela.textContent).toContain("R$ 1.500,00");
    expect(tela.textContent).toContain("7 caracteres");
    const link = [...tela.querySelectorAll("a")].find((a) => a.textContent === "Continuar edição");
    expect(link?.getAttribute("href")).toBe("/incidente/novo?rascunho=r1");
  });

  it("descarta só depois de confirmar e apaga os anexos", async () => {
    salvarRascunho("loc-a", "r1", { nome: "Maria da Silva", anexos: [anexo] });
    salvarRascunho("loc-a", "r2", { nome: "João Souza" });
    const tela = await montar();

    const cards = [...tela.querySelectorAll("li")].filter((li) => li.textContent?.includes("Maria"));
    await act(async () => botao(cards[0], "Descartar").click());
    expect(listarRascunhos("loc-a")).toHaveLength(2);
    expect(tela.textContent).toContain("Descartar este rascunho?");

    await act(async () => botao(tela, "Manter").click());
    await act(async () => botao(cards[0], "Descartar").click());
    const confirmar = [...tela.querySelectorAll(".alert button")].find(
      (b) => b.textContent === "Descartar",
    ) as HTMLButtonElement;
    await act(async () => confirmar.click());

    expect(listarRascunhos("loc-a").map((r) => r.id)).toEqual(["r2"]);
    expect(removerAnexo).toHaveBeenCalledWith("loc-a/foto.jpg");
    expect(tela.textContent).not.toContain("Maria da Silva");
    expect(tela.textContent).toContain("João Souza");
  });
});
