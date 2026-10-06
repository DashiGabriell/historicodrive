// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { BotaoInstalarApp } from "./instalar-app";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window.navigator, "userAgent", {
  configurable: true,
  value:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

describe("BotaoInstalarApp no iPhone", () => {
  it("mostra o passo a passo do Compartilhar", async () => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const raiz = createRoot(div);
    await act(async () => raiz.render(<BotaoInstalarApp />));

    const botao = div.querySelector("button");
    expect(botao?.textContent).toBe("Instalar o app");
    await act(async () => botao?.click());

    const folha = document.body.querySelector("dialog.folha");
    expect(folha?.hasAttribute("open")).toBe(true);
    expect(folha?.textContent).toContain("Adicionar à Tela de Início");

    await act(async () => raiz.unmount());
    div.remove();
  });
});
