// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BotaoInstalarApp } from "./instalar-app";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
let div: HTMLDivElement | null = null;

async function montar() {
  div = document.createElement("div");
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () => raiz?.render(<BotaoInstalarApp />));
  return div;
}

function avisoDeInstalacao(prompt = vi.fn(async () => undefined)) {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: "accepted" as const }),
  });
}

afterEach(async () => {
  await act(async () => raiz?.unmount());
  div?.remove();
  raiz = null;
  div = null;
});

// o estado da instalação vive no módulo: os casos abaixo rodam em sequência
describe("BotaoInstalarApp", () => {
  it("fica escondido no desktop sem aviso nativo", async () => {
    const montagem = await montar();
    expect(montagem.querySelector("button")).toBeNull();
  });

  it("abre a janela nativa quando o navegador oferece a instalação", async () => {
    const montagem = await montar();
    const prompt = vi.fn(async () => undefined);
    const aviso = avisoDeInstalacao(prompt);

    await act(async () => {
      window.dispatchEvent(aviso);
    });
    expect(aviso.defaultPrevented).toBe(true);

    const botao = montagem.querySelector("button");
    expect(botao?.textContent).toBe("Instalar o app");
    await act(async () => {
      botao?.click();
      await new Promise((resolver) => setTimeout(resolver, 0));
    });
    expect(prompt).toHaveBeenCalledOnce();
    // aviso usado uma vez; sem outro, o desktop volta a esconder o botão
    expect(montagem.querySelector("button")).toBeNull();
  });

  it("some depois que o app é instalado", async () => {
    const montagem = await montar();
    await act(async () => {
      window.dispatchEvent(avisoDeInstalacao());
    });
    expect(montagem.querySelector("button")).not.toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(montagem.querySelector("button")).toBeNull();
  });
});
