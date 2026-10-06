// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Perfil } from "@/lib/sessao-contexto";
import { BarraAbas, FolhaConta, type ItemMenu } from "./navegacao";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function montar(elemento: React.ReactNode, rota = "/") {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const raiz = createRoot(div);
  act(() => raiz.render(<MemoryRouter initialEntries={[rota]}>{elemento}</MemoryRouter>));
  return div;
}

const itens: ItemMenu[] = [
  { href: "/painel", rotulo: "Painel", icone: "painel" },
  { href: "/incidente/novo", rotulo: "Registrar", icone: "registrar", destaque: true },
  { href: "/config", rotulo: "Configurações", curto: "Ajustes", icone: "config" },
];

const perfil: Perfil = {
  id: "d283f989-db61-4f66-9a11-be628237ecc2",
  nome: "Dono Central",
  papel: "dono",
  locadora_ativa: "a",
  locadoras: [
    { id: "a", nome: "Locadora A", status: "aprovada" },
    { id: "b", nome: "Locadora B", status: "aprovada" },
  ],
};

describe("BarraAbas", () => {
  it("marca a aba da rota atual e usa o rótulo curto", () => {
    const div = montar(<BarraAbas itens={itens} />, "/painel");
    const ativa = div.querySelector('[aria-current="page"]');
    expect(ativa?.textContent).toBe("Painel");
    expect(div.textContent).toContain("Ajustes");
    expect(div.textContent).not.toContain("Configurações");
  });

  it("destaca a ação principal", () => {
    const div = montar(<BarraAbas itens={itens} />);
    const destaque = div.querySelector(".tabbar-item-destaque");
    expect(destaque?.getAttribute("href")).toBe("/incidente/novo");
  });
});

describe("FolhaConta", () => {
  it("troca de locadora pela lista", () => {
    const trocar = vi.fn();
    const div = montar(
      <FolhaConta
        perfil={perfil}
        aberta
        onFechar={() => undefined}
        onTrocarLocadora={trocar}
        onSair={() => undefined}
      />,
    );
    const radios = div.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(2);
    expect(radios[0]?.checked).toBe(true);
    act(() => radios[1]?.click());
    expect(trocar).toHaveBeenCalledWith("b");
  });

  it("chama sair e fecha", () => {
    const sair = vi.fn();
    const fechar = vi.fn();
    const div = montar(
      <FolhaConta
        perfil={perfil}
        aberta
        onFechar={fechar}
        onTrocarLocadora={() => undefined}
        onSair={sair}
      />,
    );
    const botoes = [...div.querySelectorAll("button")];
    act(() => botoes.find((b) => b.textContent === "Sair da conta")?.click());
    act(() => botoes.find((b) => b.textContent === "Fechar")?.click());
    expect(sair).toHaveBeenCalledOnce();
    expect(fechar).toHaveBeenCalled();
  });
});
