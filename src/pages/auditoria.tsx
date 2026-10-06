import { useState } from "react";
import { Link } from "react-router-dom";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarDataHora, rotuloAcao } from "@/lib/dominio";
import { rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  PageHeader,
  controlClass,
  type Column,
} from "@/ui";

type Registro = {
  id: number;
  acao: string;
  alvo_tipo: string;
  alvo_id: string;
  ator_nome: string | null;
  antes: unknown;
  depois: unknown;
  criado_em: string;
};

const POR_PAGINA = 200;

const ALVOS: Record<string, string> = {
  incidente: "Incidente",
  motorista: "Motorista",
  locadora: "Locadora",
};

function linkDoAlvo(r: Registro) {
  const rotulo = ALVOS[r.alvo_tipo] ?? r.alvo_tipo;
  if (r.alvo_tipo === "incidente") {
    return (
      <Link to={`/incidente/${r.alvo_id}`} className="font-semibold text-primary">
        {rotulo}
      </Link>
    );
  }
  if (r.alvo_tipo === "locadora") {
    return (
      <Link to="/config" className="font-semibold text-primary">
        {rotulo}
      </Link>
    );
  }
  return rotulo;
}

const colunas: Array<Column<Registro>> = [
  {
    key: "quando",
    header: "Quando",
    render: (r) => (
      <span className="whitespace-nowrap">{formatarDataHora(r.criado_em)}</span>
    ),
  },
  { key: "ator", header: "Quem", render: (r) => r.ator_nome ?? "Sistema" },
  { key: "acao", header: "O quê", render: (r) => rotuloAcao(r.acao) },
  { key: "alvo", header: "Alvo", render: linkDoAlvo },
  {
    key: "mudanca",
    header: "Antes / depois",
    render: (r) =>
      r.antes || r.depois ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            Ver
          </summary>
          <div className="mt-2 grid gap-2 text-left sm:min-w-[280px]">
            {r.antes ? (
              <div>
                <span className="hint">Antes</span>
                <pre className="json-diff">{JSON.stringify(r.antes, null, 2)}</pre>
              </div>
            ) : null}
            {r.depois ? (
              <div>
                <span className="hint">Depois</span>
                <pre className="json-diff">{JSON.stringify(r.depois, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </details>
      ) : (
        <span className="hint">—</span>
      ),
  },
];

export default function Auditoria() {
  useTitulo("Auditoria · HistóricoDrive");

  const { perfil } = useSessao();
  const [pagina, setPagina] = useState(0);
  const [ator, setAtor] = useState("");
  const [acao, setAcao] = useState("");
  const [alvo, setAlvo] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const carga = useCarga(`auditoria:${perfil?.locadora_ativa}:${pagina}`, () =>
    rpc<Registro[]>("listar_auditoria", {
      p_limite: POR_PAGINA,
      p_offset: pagina * POR_PAGINA,
    }),
  );

  const registros = carga.dados ?? [];
  const atores = [...new Set(registros.map((r) => r.ator_nome ?? "Sistema"))].sort();
  const acoes = [...new Set(registros.map((r) => r.acao))].sort();
  const alvos = [...new Set(registros.map((r) => r.alvo_tipo))].sort();

  const filtrados = registros.filter((r) => {
    const dia = r.criado_em.slice(0, 10);
    return (
      (!ator || (r.ator_nome ?? "Sistema") === ator) &&
      (!acao || r.acao === acao) &&
      (!alvo || r.alvo_tipo === alvo) &&
      (!de || dia >= de) &&
      (!ate || dia <= ate)
    );
  });

  const temFiltro = Boolean(ator || acao || alvo || de || ate);

  return (
    <div className="container flex flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Sua locadora"
        title="Auditoria"
        description="Registro append-only de quem fez o quê e quando. Nada aqui pode ser editado ou apagado."
      />

      <Card className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <Field label="Quem" htmlFor="f-ator">
            <select
              id="f-ator"
              className={controlClass("select")}
              value={ator}
              onChange={(e) => setAtor(e.target.value)}
            >
              <option value="">Todos</option>
              {atores.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="O quê" htmlFor="f-acao">
          <select
            id="f-acao"
            className={controlClass("select")}
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
          >
            <option value="">Todas</option>
            {acoes.map((a) => (
              <option key={a} value={a}>
                {rotuloAcao(a)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Alvo" htmlFor="f-alvo">
          <select
            id="f-alvo"
            className={controlClass("select")}
            value={alvo}
            onChange={(e) => setAlvo(e.target.value)}
          >
            <option value="">Todos</option>
            {alvos.map((a) => (
              <option key={a} value={a}>
                {ALVOS[a] ?? a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="De" htmlFor="f-de">
          <input
            id="f-de"
            type="date"
            className={controlClass("input")}
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </Field>
        <Field label="Até" htmlFor="f-ate">
          <input
            id="f-ate"
            type="date"
            className={controlClass("input")}
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </Field>
      </Card>

      {carga.erro ? (
        <ErroCarga mensagem={carga.erro} onTentar={carga.recarregar} />
      ) : !carga.dados ? (
        <CarregandoBloco linhas={6} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="hint">
              {filtrados.length} registro(s)
              {temFiltro ? " com os filtros desta página" : ""}
            </span>
            {temFiltro ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAtor("");
                  setAcao("");
                  setAlvo("");
                  setDe("");
                  setAte("");
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>

          <DataTable
            columns={colunas}
            rows={filtrados}
            rowKey={(r) => String(r.id)}
            caption="Registros de auditoria da sua locadora"
            empty={
              <EmptyState
                title="Nenhum registro"
                description={
                  temFiltro
                    ? "Nenhum registro bate com os filtros."
                    : "Ainda não há ações registradas."
                }
              />
            }
          />

          <nav
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Paginação"
          >
            <button
              type="button"
              className="page-btn"
              disabled={pagina === 0 || carga.carregando}
              onClick={() => setPagina((p) => p - 1)}
            >
              ← Mais recentes
            </button>
            <span className="page-btn active" aria-current="page">
              {pagina + 1}
            </span>
            <button
              type="button"
              className="page-btn"
              disabled={registros.length < POR_PAGINA || carga.carregando}
              onClick={() => setPagina((p) => p + 1)}
            >
              Mais antigos →
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
