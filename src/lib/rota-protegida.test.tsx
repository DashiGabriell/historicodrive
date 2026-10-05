// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RotaProtegida } from "./rota-protegida";
import { CtxSessao, type ContextoSessao, type Perfil } from "./sessao-contexto";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function contexto(perfil: Perfil | null, carregando = false): ContextoSessao {
  return {
    carregando,
    usuario: null,
    perfil,
    entrar: async () => undefined,
    sair: async () => undefined,
    esqueciSenha: async () => undefined,
    trocarSenha: async () => undefined,
    trocarLocadora: async () => undefined,
    recarregarPerfil: async () => undefined,
  };
}

const dono: Perfil = {
  id: "d283f989-db61-4f66-9a11-be628237ecc2",
  nome: "Dono Central",
  papel: "dono",
  locadora_ativa: "11111111-1111-1111-1111-111111111111",
  locadoras: [],
};

const superadmin: Perfil = {
  id: "ba0b2dce-07c4-4042-be5e-3ac6dc45f4ed",
  nome: "Superadmin",
  papel: "superadmin",
  locadora_ativa: null,
  locadoras: [],
};

async function renderRota(rota: string, perfil: Perfil | null, carregando = false) {
  const montagem = document.createElement("div");
  document.body.appendChild(montagem);
  const raiz = createRoot(montagem);

  const router = createMemoryRouter(
    [
      { path: "/login", element: <p>LOGIN</p> },
      {
        path: "/painel",
        element: (
          <RotaProtegida>
            <p>PAINEL</p>
          </RotaProtegida>
        ),
      },
      {
        path: "/admin/pendentes",
        element: (
          <RotaProtegida>
            <p>ADMIN</p>
          </RotaProtegida>
        ),
      },
    ],
    { initialEntries: [rota] },
  );

  await act(async () => {
    raiz.render(
      <CtxSessao.Provider value={contexto(perfil, carregando)}>
        <RouterProvider router={router} />
      </CtxSessao.Provider>,
    );
  });

  const html = montagem.innerHTML;
  router.dispose();
  await act(async () => raiz.unmount());
  montagem.remove();
  return html;
}

describe("RotaProtegida", () => {
  it("sem sessão, rota protegida cai no /login", async () => {
    expect(await renderRota("/painel", null)).toContain("LOGIN");
  });

  it("dono com locadora ativa entra no painel", async () => {
    expect(await renderRota("/painel", dono)).toContain("PAINEL");
  });

  it("dono não alcança /admin", async () => {
    expect(await renderRota("/admin/pendentes", dono)).toContain("Acesso negado");
  });

  it("superadmin entra na fila de aprovação", async () => {
    expect(await renderRota("/admin/pendentes", superadmin)).toContain("ADMIN");
  });

  it("superadmin não usa as telas da locadora (vice-versa)", async () => {
    expect(await renderRota("/painel", superadmin)).toContain("Acesso negado");
  });

  it("segura a tela enquanto a sessão carrega", async () => {
    expect(await renderRota("/painel", null, true)).toContain("Carregando");
  });
});
