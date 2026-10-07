import { useState } from "react";
import { Link } from "react-router-dom";
import { CarregandoBloco, EstadoBadge, ErroCarga } from "@/components/dominio";
import {
  TIPOS,
  dataIso,
  formatarData,
  formatarMoeda,
  type Confianca,
  type Estado,
  type TipoIncidente,
} from "@/lib/dominio";
import { atualizarNaoLidas } from "@/lib/notificacoes";
import { rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Button,
  ButtonLink,
  Card,
  CardDesc,
  CardTitle,
  DataTable,
  EmptyState,
  Field,
  Metric,
  PageHeader,
  controlClass,
  cx,
  type Column,
} from "@/ui";

type Kpis = {
  periodo: { de: string; ate: string };
  prejuizo_acumulado: number;
  prejuizo_periodo: number;
  incidentes_periodo: number;
  por_tipo: Partial<Record<TipoIncidente, number>>;
  por_estado: Partial<Record<Estado, number>>;
  por_mes: Array<{ mes: string; total: number }>;
  top_placas: Array<{ placa: string; total: number }>;
};

type IncidenteResumo = {
  id: string;
  motorista_id: string;
  motorista_nome: string;
  cpf_mascarado: string;
  placa: string;
  tipo: TipoIncidente;
  valor: number | null;
  estado: Estado;
  confianca: Confianca;
  criado_em: string;
  tem_anexo: boolean;
};

type Notificacao = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  incidente_id: string | null;
  lida: boolean;
  criado_em: string;
};

const NOME_MES = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

/** "out/25": cabe embaixo de uma barra estreita */
function rotuloMes(data: Date): string {
  const partes = NOME_MES.formatToParts(data);
  const mes = partes.find((p) => p.type === "month")?.value.replace(".", "") ?? "";
  const ano = partes.find((p) => p.type === "year")?.value ?? "";
  return `${mes}/${ano}`;
}

/** todos os meses do periodo, inclusive os sem incidente */
function mesesDoPeriodo(de: string, ate: string, comDados: Kpis["por_mes"]) {
  const totais = new Map(comDados.map((m) => [m.mes, m.total]));
  const meses: Array<{ mes: string; rotulo: string; total: number }> = [];
  const cursor = new Date(`${de.slice(0, 7)}-01T00:00:00`);
  const fim = new Date(`${ate.slice(0, 7)}-01T00:00:00`);

  while (cursor <= fim && meses.length < 36) {
    const chave = dataIso(cursor).slice(0, 7);
    meses.push({
      mes: chave,
      rotulo: rotuloMes(cursor),
      total: totais.get(chave) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return meses;
}

function hojeMenos(meses: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return dataIso(d);
}

const colunas: Array<Column<IncidenteResumo>> = [
  {
    key: "motorista",
    header: "Motorista",
    render: (i) => (
      <Link to={`/incidente/${i.id}`} className="font-semibold text-primary">
        {i.motorista_nome}
      </Link>
    ),
  },
  { key: "placa", header: "Placa", render: (i) => i.placa },
  { key: "tipo", header: "Tipo", render: (i) => TIPOS[i.tipo] },
  {
    key: "valor",
    header: "Valor",
    align: "right",
    render: (i) => formatarMoeda(i.valor),
  },
  { key: "estado", header: "Estado", render: (i) => <EstadoBadge estado={i.estado} /> },
  { key: "data", header: "Data", render: (i) => formatarData(i.criado_em) },
];

export default function Painel() {
  useTitulo("Painel · Histórico");

  const { perfil } = useSessao();
  const locadora = perfil?.locadoras.find((l) => l.id === perfil.locadora_ativa);
  const [de, setDe] = useState(() => hojeMenos(12));
  const [ate, setAte] = useState(() => dataIso(new Date()));

  const kpis = useCarga(`kpis:${perfil?.locadora_ativa}:${de}:${ate}`, () =>
    rpc<Kpis>("painel_kpis", { p_de: de || null, p_ate: ate || null }),
  );
  const recentes = useCarga(`recentes:${perfil?.locadora_ativa}`, () =>
    rpc<IncidenteResumo[]>("listar_incidentes", { p_limite: 10 }),
  );
  const notificacoes = useCarga(`notif:${perfil?.locadora_ativa}`, () =>
    rpc<Notificacao[]>("listar_notificacoes", { p_limite: 8 }),
  );

  async function marcarLida(n: Notificacao) {
    try {
      await rpc("marcar_notificacao_lida", { p_notificacao_id: n.id });
      notificacoes.recarregar();
      void atualizarNaoLidas();
    } catch {
      /* falha silenciosa: alerta e so um atalho */
    }
  }

  const k = kpis.dados;
  const meses = k ? mesesDoPeriodo(k.periodo.de, k.periodo.ate, k.por_mes) : [];
  const maiorMes = Math.max(1, ...meses.map((m) => m.total));
  const maiorTipo = Math.max(1, ...Object.values(k?.por_tipo ?? {}));

  return (
    <div className="container flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <PageHeader
        eyebrow={locadora?.nome ?? "Sua locadora"}
        title="Painel"
        description="Somente os números da sua locadora. A rede não entra aqui."
        actions={
          <div className="hidden flex-wrap gap-2 md:flex">
            <ButtonLink href="/busca" variant="outline">
              Buscar motorista
            </ButtonLink>
            <ButtonLink href="/incidente/novo">Registrar incidente</ButtonLink>
          </div>
        }
      />

      <Card className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
        <Field label="De" htmlFor="painel-de">
          <input
            id="painel-de"
            type="date"
            className={controlClass("input")}
            value={de}
            max={ate}
            onChange={(e) => setDe(e.target.value)}
          />
        </Field>
        <Field label="Até" htmlFor="painel-ate">
          <input
            id="painel-ate"
            type="date"
            className={controlClass("input")}
            value={ate}
            min={de}
            onChange={(e) => setAte(e.target.value)}
          />
        </Field>
        <div
          className="tabs col-span-2 grid grid-cols-3"
          role="group"
          aria-label="Período rápido"
        >
          {[
            ["30 dias", 1],
            ["6 meses", 6],
            ["12 meses", 12],
          ].map(([rotulo, meses]) => (
            <button
              key={rotulo}
              type="button"
              className="tab"
              aria-pressed={
                de === hojeMenos(Number(meses)) && ate === dataIso(new Date())
              }
              onClick={() => {
                setDe(hojeMenos(Number(meses)));
                setAte(dataIso(new Date()));
              }}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </Card>

      {kpis.erro ? <ErroCarga mensagem={kpis.erro} onTentar={kpis.recarregar} /> : null}

      {notificacoes.dados && notificacoes.dados.some((n) => !n.lida) ? (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Alertas</CardTitle>
            <Link to="/notificacoes" className="text-sm font-semibold text-primary">
              Ver todas
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {notificacoes.dados
              .filter((n) => !n.lida)
              .map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="label">
                      {n.incidente_id ? (
                        <Link to={`/incidente/${n.incidente_id}`} className="text-primary">
                          {n.titulo}
                        </Link>
                      ) : (
                        n.titulo
                      )}
                    </p>
                    {n.corpo ? <p className="hint">{n.corpo}</p> : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void marcarLida(n)}>
                    Marcar lida
                  </Button>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {!k && kpis.carregando ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CarregandoBloco key={i} linhas={1} />
          ))}
        </div>
      ) : k ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Metric
              label="Prejuízo acumulado"
              value={formatarMoeda(k.prejuizo_acumulado)}
            />
            <Metric
              label="Prejuízo no período"
              value={formatarMoeda(k.prejuizo_periodo)}
              tone={k.prejuizo_periodo > 0 ? "destructive" : undefined}
            />
            <Metric label="Incidentes no período" value={k.incidentes_periodo} />
            <Metric
              label="Em suspeita"
              value={k.por_estado.suspeita ?? 0}
              tone={(k.por_estado.suspeita ?? 0) > 0 ? "warning" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-4 lg:col-span-2">
              <div>
                <CardTitle>Incidentes por mês</CardTitle>
                <CardDesc>
                  {formatarData(k.periodo.de)} a {formatarData(k.periodo.ate)}
                </CardDesc>
              </div>
              {meses.length === 0 ? null : (
                <div
                  className="chart-bars flex items-end gap-1 sm:gap-2"
                  role="img"
                  aria-label={meses.map((m) => `${m.rotulo}: ${m.total}`).join(", ")}
                >
                  {meses.map((m) => (
                    <div
                      key={m.mes}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="hint">{m.total || ""}</span>
                      <div
                        className="chart-bar"
                        style={{ height: `${(m.total / maiorMes) * 85}%` }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1 sm:gap-2" aria-hidden="true">
                {meses.map((m, i) => (
                  <span
                    key={m.mes}
                    className={cx(
                      "hint min-w-0 flex-1 whitespace-nowrap text-center",
                      (meses.length - 1 - i) % 2 === 1 && "max-sm:invisible",
                    )}
                  >
                    {m.rotulo}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="flex flex-col gap-4">
              <CardTitle>Por tipo</CardTitle>
              {(Object.keys(TIPOS) as TipoIncidente[]).map((tipo) => {
                const total = k.por_tipo[tipo] ?? 0;
                return (
                  <div key={tipo} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span>{TIPOS[tipo]}</span>
                      <strong>{total}</strong>
                    </div>
                    <div className="progress">
                      <span style={{ width: `${(total / maiorTipo) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="flex flex-col gap-3">
              <CardTitle>Placas mais atingidas</CardTitle>
              {k.top_placas.length === 0 ? (
                <CardDesc>Nenhum incidente no período.</CardDesc>
              ) : (
                <ol className="flex flex-col gap-2">
                  {k.top_placas.map((p, i) => (
                    <li
                      key={p.placa}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-3">
                        <span className="avatar">{i + 1}</span>
                        <strong>{p.placa}</strong>
                      </span>
                      <span className="hint">
                        {p.total} incidente{p.total > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <div className="flex flex-col gap-3 lg:col-span-2">
              <h2 className="text-lg font-bold">Últimos registros da sua locadora</h2>
              {recentes.erro ? (
                <ErroCarga mensagem={recentes.erro} onTentar={recentes.recarregar} />
              ) : !recentes.dados ? (
                <CarregandoBloco />
              ) : (
                <DataTable
                  columns={colunas}
                  rows={recentes.dados}
                  rowKey={(i) => i.id}
                  caption="Últimos incidentes registrados pela sua locadora"
                  empty={
                    <EmptyState
                      title="Nenhum incidente ainda"
                      description="Quando você registrar o primeiro, ele aparece aqui."
                      action={
                        <ButtonLink href="/incidente/novo" size="sm">
                          Registrar incidente
                        </ButtonLink>
                      }
                    />
                  }
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
