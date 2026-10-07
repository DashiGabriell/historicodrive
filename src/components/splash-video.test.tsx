// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deveMostrarSplash } from "@/lib/pwa";
import { SplashVideo } from "./splash-video";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let raiz: Root | null = null;
let div: HTMLDivElement | null = null;

function simularTela({ instalado, reduzMovimento = false }: { instalado: boolean; reduzMovimento?: boolean }) {
  window.matchMedia = ((consulta: string) => ({
    matches:
      (consulta.includes("standalone") && instalado) ||
      (consulta.includes("reduced-motion") && reduzMovimento),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

async function montar() {
  div = document.createElement("div");
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () => raiz?.render(<SplashVideo />));
  return div;
}

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

afterEach(async () => {
  await act(async () => raiz?.unmount());
  div?.remove();
  raiz = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("deveMostrarSplash", () => {
  it("só no app instalado, uma vez, sem redução de movimento", () => {
    expect(deveMostrarSplash({ instalado: true, jaViu: false, reduzMovimento: false })).toBe(true);
    expect(deveMostrarSplash({ instalado: false, jaViu: false, reduzMovimento: false })).toBe(false);
    expect(deveMostrarSplash({ instalado: true, jaViu: true, reduzMovimento: false })).toBe(false);
    expect(deveMostrarSplash({ instalado: true, jaViu: false, reduzMovimento: true })).toBe(false);
  });
});

describe("SplashVideo", () => {
  it("não aparece no navegador comum", async () => {
    simularTela({ instalado: false });
    const tela = await montar();
    expect(tela.querySelector(".splash-video")).toBeNull();
  });

  it("não aparece para quem pediu menos movimento", async () => {
    simularTela({ instalado: true, reduzMovimento: true });
    const tela = await montar();
    expect(tela.querySelector(".splash-video")).toBeNull();
  });

  it("toca mudo e inline, e Pular encerra", async () => {
    vi.useFakeTimers();
    simularTela({ instalado: true });
    const tela = await montar();
    const video = tela.querySelector("video");
    expect(video?.muted).toBe(true);
    expect(video?.hasAttribute("playsinline")).toBe(true);
    expect(sessionStorage.getItem("hd.splash.visto")).toBe("1");

    await act(async () => tela.querySelector<HTMLButtonElement>(".splash-pular")?.click());
    expect(tela.querySelector(".splash-video")?.hasAttribute("data-saindo")).toBe(true);
    await act(async () => vi.advanceTimersByTime(400));
    expect(tela.querySelector(".splash-video")).toBeNull();
  });

  it("não repete na mesma abertura", async () => {
    simularTela({ instalado: true });
    sessionStorage.setItem("hd.splash.visto", "1");
    const tela = await montar();
    expect(tela.querySelector(".splash-video")).toBeNull();
  });

  it("sai sozinho quando o autoplay é bloqueado", async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotAllowedError"));
    simularTela({ instalado: true });
    const tela = await montar();
    await act(async () => vi.advanceTimersByTime(400));
    expect(tela.querySelector(".splash-video")).toBeNull();
  });

  it("sai sozinho se o vídeo não começar em 3 segundos", async () => {
    vi.useFakeTimers();
    simularTela({ instalado: true });
    const tela = await montar();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(tela.querySelector(".splash-video")?.hasAttribute("data-saindo")).toBe(true);
    await act(async () => vi.advanceTimersByTime(400));
    expect(tela.querySelector(".splash-video")).toBeNull();
  });
});
