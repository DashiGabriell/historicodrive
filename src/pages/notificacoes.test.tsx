// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CtxSessao, type ContextoSessao } from "@/lib/sessao-contexto";
import Notificacoes from "./notificacoes";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rpc", async (original) => ({
  ...(await original<typeof import("@/lib/rpc")>()),
  rpc,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sessao = {
  carregando: false,
  usuario: null,
  perfil: { id: "u1", nome: "Dono", papel: "dono", locadora_ativa: "loc-a", locadoras: [] },
} as unknown as ContextoSessao;

let alertas: unknown[] = [];
let comunicados: unknown[] = [];

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
          <Notificacoes />
        </CtxSessao.Provider>
      </MemoryRouter>,
    ),
  );
  return div;
}

function botao(container: HTMLElement, texto: string) {
  const achado = [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(texto));
  if (!achado) throw new Error(`botão "${texto}" não encontrado`);
  return achado;
}

beforeEach(() => {
  alertas = [];
  comunicados = [];
  rpc.mockReset();
  rpc.mockImplementation(async (nome: string) => {
    if (nome === "listar_notificacoes") return alertas;
    if (nome === "listar_comunicados") return comunicados;
    if (nome === "contar_nao_lidas") return { alertas: 0, novidades: 0 };
    return null;
  });
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  div?.remove();
  raiz = null;
});

describe("tela de notificações", () => {
  it("mostra os estados vazios", async () => {
    const tela = await montar();
    expect(tela.textContent).toContain("Nenhum alerta");
    await act(async () => botao(tela, "Novidades").click());
    expect(tela.textContent).toContain("Nenhuma novidade");
  });

  it("abre em Novidades quando só há comunicado novo e marca como lido", async () => {
    comunicados = [
      {
        id: "c1",
        tipo: "novidade",
        titulo: "Nova tela de rascunhos",
        corpo: "Continue registros pela metade.",
        link: "/rascunhos",
        lido: false,
        criado_em: "2026-10-07T12:00:00Z",
      },
    ];
    const tela = await montar();
    expect(tela.textContent).toContain("Nova tela de rascunhos");
    expect(botao(tela, "Novidades").textContent).toBe("Novidades (1)");
    const link = [...tela.querySelectorAll("a")].find((a) => a.textContent === "Ver agora");
    expect(link?.getAttribute("href")).toBe("/rascunhos");

    await act(async () => botao(tela, "Marcar como lido").click());
    expect(rpc).toHaveBeenCalledWith("marcar_comunicado_lido", { p_comunicado_id: "c1" });
  });

  it("lista alertas com link para o incidente e marca tudo como lido", async () => {
    alertas = [
      {
        id: "a1",
        tipo: "contestacao",
        titulo: "Nova contestacao",
        corpo: "Responda em ate 15 dias uteis.",
        incidente_id: "inc-1",
        lida: false,
        criado_em: "2026-10-07T12:00:00Z",
      },
    ];
    const tela = await montar();
    expect(tela.textContent).toContain("Nova contestacao");
    const link = [...tela.querySelectorAll("a")].find((a) => a.textContent === "Ver incidente");
    expect(link?.getAttribute("href")).toBe("/incidente/inc-1");

    await act(async () => botao(tela, "Marcar tudo como lido").click());
    expect(rpc).toHaveBeenCalledWith("marcar_tudo_lido");
  });
});
