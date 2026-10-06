import { useEffect, useState, type ReactNode } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { BarraAbas, FolhaConta, type ItemMenu } from "@/components/navegacao";
import { iniciais } from "@/lib/dominio";
import { acessoPara, rotaInicial } from "@/lib/permissao";
import { useOnline } from "@/lib/pwa";
import { RotaProtegida } from "@/lib/rota-protegida";
import { useSessao } from "@/lib/sessao-contexto";
import Auditoria from "@/pages/auditoria";
import Busca from "@/pages/busca";
import Cadastro from "@/pages/cadastro";
import Configuracoes from "@/pages/configuracoes";
import Contestacoes from "@/pages/contestacoes";
import Contestar from "@/pages/contestar";
import EsqueciSenha from "@/pages/esqueci-senha";
import FilaAdmin from "@/pages/fila-admin";
import Home from "@/pages/home";
import OperadorContas from "@/pages/operador/contas";
import OperadorLocadoras from "@/pages/operador/locadoras";
import OperadorRecursos from "@/pages/operador/recursos";
import OperadorRetencao from "@/pages/operador/retencao";
import OperadorTrilha from "@/pages/operador/trilha";
import OperadorVisao from "@/pages/operador/visao";
import Incidente from "@/pages/incidente";
import IncidenteNovo from "@/pages/incidente-novo";
import Login from "@/pages/login";
import Motorista from "@/pages/motorista";
import NotFound from "@/pages/not-found";
import Painel from "@/pages/painel";
import Rascunhos from "@/pages/rascunhos";
import RedefinirSenha from "@/pages/redefinir-senha";
import Styleguide from "@/pages/styleguide";
import Termos from "@/pages/termos";
import { Alert, Button, ButtonLink, controlClass, cx } from "@/ui";

const MENU_LOCADORA: ItemMenu[] = [
  { href: "/painel", rotulo: "Painel", icone: "painel" },
  { href: "/busca", rotulo: "Buscar", icone: "buscar" },
  { href: "/incidente/novo", rotulo: "Registrar", icone: "registrar", destaque: true },
  { href: "/contestacoes", rotulo: "Contestações", icone: "contestacao" },
  { href: "/rascunhos", rotulo: "Rascunhos", icone: "rascunho", secundario: true },
  { href: "/auditoria", rotulo: "Auditoria", icone: "auditoria", secundario: true },
  { href: "/config", rotulo: "Configurações", icone: "config", secundario: true },
];

const MENU_SUPERADMIN: ItemMenu[] = [
  { href: "/dashitecnology", rotulo: "Visão", icone: "painel", exato: true },
  { href: "/dashitecnology/locadoras", rotulo: "Locadoras", icone: "locadora" },
  { href: "/dashitecnology/recursos", rotulo: "Recursos", icone: "contestacao" },
  {
    href: "/dashitecnology/contas",
    rotulo: "Contas",
    icone: "contas",
    secundario: true,
  },
  {
    href: "/dashitecnology/retencao",
    rotulo: "Retenção",
    icone: "retencao",
    secundario: true,
  },
  {
    href: "/dashitecnology/trilha",
    rotulo: "Trilha",
    icone: "auditoria",
    secundario: true,
  },
];

function protegida(elemento: ReactNode) {
  return <RotaProtegida>{elemento}</RotaProtegida>;
}

/** como app nativo: tela nova abre no topo; voltar preserva a posição */
function useRolagemAoTopo() {
  const { pathname } = useLocation();
  const tipo = useNavigationType();
  useEffect(() => {
    if (tipo !== "POP") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, tipo]);
}

export default function App() {
  const { carregando, perfil, trocarLocadora, sair } = useSessao();
  const [erroTroca, setErroTroca] = useState<string | null>(null);
  const [contaAberta, setContaAberta] = useState(false);
  const online = useOnline();
  const local = useLocation();
  const navegar = useNavigate();
  useRolagemAoTopo();

  const telaDeDetalhe = /^\/(motorista\/[^/]+|incidente\/(?!novo$)[^/]+)$/.test(
    local.pathname,
  );

  function voltar() {
    // aberto direto por link não há histórico interno para onde voltar
    if (local.key === "default")
      navegar(rotaInicial(perfil?.papel ?? null), { replace: true });
    else navegar(-1);
  }

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
  const menu = !perfil
    ? []
    : perfil.papel === "superadmin"
      ? MENU_SUPERADMIN
      : acessoPara("/painel", perfil) === "ok"
        ? MENU_LOCADORA
        : [];
  const comAbas = menu.length > 1;
  const abas = menu.filter((item) => !item.secundario);
  const secundarios = menu.filter((item) => item.secundario);
  const naFolha = secundarios.some((item) => local.pathname.startsWith(item.href));

  return (
    <div className={cx("flex flex-1 flex-col", comAbas && "com-abas")}>
      <header className="app-topo sticky top-0 z-50">
        <div className="container flex h-[var(--header-h)] items-center justify-between gap-4">
          {telaDeDetalhe ? (
            <button type="button" className="voltar md:hidden" onClick={voltar}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Voltar
            </button>
          ) : null}
          <Link
            to="/"
            className={cx(
              "shrink-0 items-center gap-3",
              telaDeDetalhe ? "hidden md:flex" : "flex",
            )}
          >
            <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9" />
            <span
              className={cx(
                "text-lg font-semibold tracking-tight text-foreground",
                perfil ? "inline" : "hidden sm:inline",
              )}
            >
              Histórico
            </span>
          </Link>

          {menu.length > 0 ? (
            <nav
              aria-label="Seções"
              className={cx(
                "min-w-0 flex-1 items-center gap-1 overflow-x-auto",
                comAbas ? "hidden md:flex" : "flex",
              )}
            >
              {menu.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.exato || item.href === "/incidente/novo"}
                  className="nav-link"
                >
                  {item.rotulo}
                </NavLink>
              ))}
            </nav>
          ) : null}

          <nav aria-label="Conta" className="flex shrink-0 items-center gap-2">
            {carregando ? null : perfil ? (
              <>
                <div className="hidden items-center gap-2 md:flex">
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
                    <span className="label hidden lg:inline">{locadoraAtual.nome}</span>
                  ) : null}

                  <span className="label hidden xl:inline">{perfil.nome}</span>

                  <Button variant="outline" size="sm" onClick={() => void sair()}>
                    Sair
                  </Button>
                </div>

                <button
                  type="button"
                  className={cx("conta-botao md:hidden", comAbas && "hidden")}
                  aria-label={`Conta de ${perfil.nome}`}
                  aria-haspopup="dialog"
                  aria-expanded={contaAberta}
                  onClick={() => setContaAberta(true)}
                >
                  <span className="avatar">{iniciais(perfil.nome)}</span>
                </button>
              </>
            ) : (
              <>
                <ButtonLink href="/cadastro" variant="ghost" size="sm">
                  Sou locadora
                </ButtonLink>
                <ButtonLink href="/login" size="sm">
                  Entrar
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
        {!online ? (
          <p className="faixa-offline" role="status">
            Sem conexão. O que já foi carregado continua na tela.
          </p>
        ) : null}
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
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/termos" element={<Termos />} />
          <Route path="/contestar" element={<Contestar />} />
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir" element={<RedefinirSenha />} />

          <Route path="/painel" element={protegida(<Painel />)} />
          <Route path="/busca" element={protegida(<Busca />)} />
          <Route path="/motorista/:id" element={protegida(<Motorista />)} />
          <Route path="/incidente/novo" element={protegida(<IncidenteNovo />)} />
          <Route path="/incidente/:id" element={protegida(<Incidente />)} />
          <Route path="/rascunhos" element={protegida(<Rascunhos />)} />
          <Route path="/config" element={protegida(<Configuracoes />)} />
          <Route path="/auditoria" element={protegida(<Auditoria />)} />
          <Route path="/contestacoes" element={protegida(<Contestacoes />)} />
          <Route path="/admin/pendentes" element={protegida(<FilaAdmin />)} />
          <Route path="/dashitecnology" element={protegida(<OperadorVisao />)} />
          <Route
            path="/dashitecnology/locadoras"
            element={protegida(<OperadorLocadoras />)}
          />
          <Route
            path="/dashitecnology/recursos"
            element={protegida(<OperadorRecursos />)}
          />
          <Route
            path="/dashitecnology/contas"
            element={protegida(<OperadorContas />)}
          />
          <Route
            path="/dashitecnology/retencao"
            element={protegida(<OperadorRetencao />)}
          />
          <Route
            path="/dashitecnology/trilha"
            element={protegida(<OperadorTrilha />)}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {comAbas ? (
        <BarraAbas
          itens={abas}
          mais={
            secundarios.length > 0
              ? {
                  ativa: naFolha,
                  aberta: contaAberta,
                  onAbrir: () => setContaAberta(true),
                }
              : undefined
          }
        />
      ) : null}

      {perfil ? (
        <FolhaConta
          perfil={perfil}
          links={secundarios}
          aberta={contaAberta}
          onFechar={() => setContaAberta(false)}
          onTrocarLocadora={(id) => {
            setContaAberta(false);
            void trocarLocadoraAtiva(id);
          }}
          onSair={() => {
            setContaAberta(false);
            void sair();
          }}
        />
      ) : null}
    </div>
  );
}
