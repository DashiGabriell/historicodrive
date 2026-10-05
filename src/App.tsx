import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { RotaProtegida } from "@/lib/rota-protegida";
import { useSessao } from "@/lib/sessao-contexto";
import {
  Auditoria,
  Busca,
  Configuracoes,
  FilaAdmin,
  Incidente,
  IncidenteNovo,
  Motorista,
  Painel,
} from "@/pages/em-construcao";
import EsqueciSenha from "@/pages/esqueci-senha";
import Home from "@/pages/home";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import RedefinirSenha from "@/pages/redefinir-senha";
import Styleguide from "@/pages/styleguide";
import { Alert, Button, ButtonLink, controlClass } from "@/ui";

export default function App() {
  const { carregando, perfil, trocarLocadora, sair } = useSessao();
  const [erroTroca, setErroTroca] = useState<string | null>(null);

  async function trocarLocadoraAtiva(locadoraId: string) {
    setErroTroca(null);
    try {
      await trocarLocadora(locadoraId);
    } catch (causa) {
      setErroTroca(
        causa instanceof Error ? causa.message : "Não foi possível trocar de locadora.",
      );
    }
  }

  const locadoraAtual = perfil?.locadoras.find((l) => l.id === perfil.locadora_ativa);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b border-[hsl(var(--border))]">
        <div className="container flex h-[72px] items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Histórico<span className="text-primary">Drive</span>
            </span>
          </Link>

          <nav aria-label="Principal" className="flex items-center gap-2">
            {carregando ? null : perfil ? (
              <>
                {perfil.locadoras.length > 1 ? (
                  <select
                    aria-label="Locadora ativa"
                    className={controlClass("select")}
                    value={perfil.locadora_ativa ?? ""}
                    onChange={(e) => void trocarLocadoraAtiva(e.target.value)}
                  >
                    {perfil.locadoras.map((locadora) => (
                      <option key={locadora.id} value={locadora.id}>
                        {locadora.nome}
                      </option>
                    ))}
                  </select>
                ) : locadoraAtual ? (
                  <span className="label hidden sm:inline">{locadoraAtual.nome}</span>
                ) : null}

                <span className="label hidden md:inline">{perfil.nome}</span>

                <Button variant="outline" size="sm" onClick={() => void sair()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <ButtonLink href="/styleguide" variant="ghost" size="sm">
                  Design system
                </ButtonLink>
                <ButtonLink href="/login" size="sm">
                  Entrar
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {erroTroca ? (
        <Alert variant="destructive" className="container mt-4">
          {erroTroca}
        </Alert>
      ) : null}

      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/styleguide" element={<Styleguide />} />
          <Route path="/login" element={<Login />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir" element={<RedefinirSenha />} />

          <Route
            path="/painel"
            element={
              <RotaProtegida>
                <Painel />
              </RotaProtegida>
            }
          />
          <Route
            path="/busca"
            element={
              <RotaProtegida>
                <Busca />
              </RotaProtegida>
            }
          />
          <Route
            path="/motorista/:id"
            element={
              <RotaProtegida>
                <Motorista />
              </RotaProtegida>
            }
          />
          <Route
            path="/incidente/novo"
            element={
              <RotaProtegida>
                <IncidenteNovo />
              </RotaProtegida>
            }
          />
          <Route
            path="/incidente/:id"
            element={
              <RotaProtegida>
                <Incidente />
              </RotaProtegida>
            }
          />
          <Route
            path="/config"
            element={
              <RotaProtegida>
                <Configuracoes />
              </RotaProtegida>
            }
          />
          <Route
            path="/auditoria"
            element={
              <RotaProtegida>
                <Auditoria />
              </RotaProtegida>
            }
          />
          <Route
            path="/admin/pendentes"
            element={
              <RotaProtegida>
                <FilaAdmin />
              </RotaProtegida>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
