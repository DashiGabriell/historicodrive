import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarDataHora, rotuloAcao } from "@/lib/dominio";
import { rpc } from "@/lib/rpc";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import { DataTable, EmptyState, PageHeader, type Column } from "@/ui";

type Evento = {
  id: string;
  quando: string;
  acao: string;
  alvo: string;
  quem: string;
  onde: string;
  resumo: string;
};

const ALVO: Record<string, string> = {
  Locadora: "Locadora",
  Contestacao: "Contestação",
  Conta: "Conta",
  Retencao: "Retenção",
};

const colunas: Array<Column<Evento>> = [
  {
    key: "quando",
    header: "Quando",
    render: (e) => (
      <span className="whitespace-nowrap">{formatarDataHora(e.quando)}</span>
    ),
  },
  { key: "quem", header: "Quem", render: (e) => e.quem },
  { key: "acao", header: "O quê", render: (e) => rotuloAcao(e.acao) },
  { key: "alvo", header: "Alvo", render: (e) => ALVO[e.alvo] ?? e.alvo },
  { key: "onde", header: "Onde", render: (e) => e.onde },
  { key: "resumo", header: "Resumo", render: (e) => e.resumo },
];

export default function OperadorTrilha() {
  useTitulo("Trilha · Operação · Histórico");
  const trilha = useCarga("operador-trilha", () =>
    rpc<Evento[]>("operador_trilha", { p_limite: 80 }),
  );

  return (
    <div className="container flex flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Trilha da plataforma"
        description="Decisões de locadora, contestação, papel e retenção. O conteúdo de motorista e incidente não entra nesta lista."
      />

      {trilha.erro ? (
        <ErroCarga mensagem={trilha.erro} onTentar={trilha.recarregar} />
      ) : !trilha.dados ? (
        <CarregandoBloco linhas={5} />
      ) : (
        <DataTable
          columns={colunas}
          rows={trilha.dados}
          rowKey={(e) => e.id}
          caption="Trilha operacional"
          empty={
            <EmptyState
              title="Trilha vazia"
              description="Ainda não há decisão de locadora, contestação ou conta."
            />
          }
        />
      )}
    </div>
  );
}
