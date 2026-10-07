// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OperadorComunicados from "./comunicados";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rpc", async (original) => ({
  ...(await original<typeof import("@/lib/rpc")>()),
  rpc,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
let div: HTMLDivElement | null = null;

async function montar() {
  div = document.createElement("div");
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () =>
    raiz?.render(
      <MemoryRouter>
        <OperadorComunicados />
      </MemoryRouter>,
    ),
  );
  return div;
}

function digitar(campo: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const prototipo = Object.getPrototypeOf(campo) as object;
  Object.getOwnPropertyDescriptor(prototipo, "value")?.set?.call(campo, valor);
  campo.dispatchEvent(new Event("input", { bubbles: true }));
}

function botao(container: HTMLElement, texto: string) {
  const achado = [...container.querySelectorAll("button")].find((b) => b.textContent === texto);
  if (!achado) throw new Error(`botão "${texto}" não encontrado`);
  return achado;
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockImplementation(async (nome: string) => {
    if (nome === "listar_comunicados_admin") return { destinatarios: 6, itens: [] };
    if (nome === "publicar_comunicado") return "novo-id";
    return null;
  });
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  div?.remove();
  raiz = null;
});

describe("comunicados do operador", () => {
  it("valida antes de enviar", async () => {
    const tela = await montar();
    const titulo = tela.querySelector<HTMLInputElement>("#comunicado-titulo")!;
    await act(async () => digitar(titulo, "ab"));
    await act(async () => botao(tela, "Revisar e enviar").click());
    expect(tela.textContent).toMatch(/título precisa/);
    expect(rpc).not.toHaveBeenCalledWith("publicar_comunicado", expect.anything());
  });

  it("pede confirmação com o número de destinatários e envia", async () => {
    const tela = await montar();
    await act(async () => digitar(tela.querySelector("#comunicado-titulo")!, "Nova tela de rascunhos"));
    await act(async () => digitar(tela.querySelector("#comunicado-corpo")!, "Continue registros pela metade."));
    await act(async () => digitar(tela.querySelector("#comunicado-link")!, "/rascunhos"));
    expect(tela.textContent).toContain("Nova tela de rascunhos");

    await act(async () => botao(tela, "Revisar e enviar").click());
    expect(tela.textContent).toContain("Enviar para 6 contas?");

    await act(async () => botao(tela, "Enviar agora").click());
    expect(rpc).toHaveBeenCalledWith("publicar_comunicado", {
      p_tipo: "novidade",
      p_titulo: "Nova tela de rascunhos",
      p_corpo: "Continue registros pela metade.",
      p_link: "/rascunhos",
    });
    expect(tela.textContent).toContain("Comunicado enviado para 6 contas.");
  });
});
