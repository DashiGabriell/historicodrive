import { useMemo, useState, type FormEvent } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarCnpj, formatarDataHora } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDesc,
  CardTitle,
  EmptyState,
  Field,
  PageHeader,
  Tabs,
  controlClass,
  type BadgeVariant,
} from "@/ui";

type StatusLocadora = "pendente" | "aprovada" | "recusada";

type Locadora = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  email_contato: string;
  status: StatusLocadora;
  receber_da_rede: boolean;
  motivo_recusa: string | null;
  criado_em: string;
  aprovado_em: string | null;
  membros: number;
};

const STATUS: Record<StatusLocadora, { rotulo: string; variante: BadgeVariant }> = {
  pendente: { rotulo: "Pendente", variante: "warning" },
  aprovada: { rotulo: "Aprovada", variante: "success" },
  recusada: { rotulo: "Recusada", variante: "destructive" },
};

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "pendente", label: "Pendentes" },
  { id: "aprovada", label: "Aprovadas" },
  { id: "recusada", label: "Recusadas" },
];

export default function OperadorLocadoras() {
  useTitulo("Locadoras · Operação · Histórico");
  const lista = useCarga("operador-locadoras", () =>
    rpc<Locadora[]>("operador_listar_locadoras"),
  );
  const [filtro, setFiltro] = useState("todas");
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const visiveis = useMemo(
    () => (lista.dados ?? []).filter((l) => filtro === "todas" || l.status === filtro),
    [lista.dados, filtro],
  );

  async function decidir(locadora: Locadora, acao: "aprovar" | "recusar") {
    setErro(null);
    setAviso(null);
    if (acao === "recusar" && motivo.trim().length < 5) {
      setErro("A recusa exige um motivo (ao menos 5 caracteres).");
      return;
    }
    setOcupado(locadora.id);
    try {
      await rpc("decidir_locadora", {
        p_locadora_id: locadora.id,
        p_acao: acao,
        p_motivo: acao === "recusar" ? motivo.trim() : null,
      });
      setAviso(`${locadora.nome} foi ${acao === "aprovar" ? "aprovada" : "recusada"}.`);
      setRecusando(null);
      setMotivo("");
      lista.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível registrar a decisão."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Locadoras"
        description="Quem pediu acesso à rede. Aprovar libera o dono; recusar exige motivo. Receber da rede é decisão da própria locadora."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      <Tabs tabs={FILTROS} value={filtro} onValueChange={setFiltro} label="Situação" />

      {lista.erro ? (
        <ErroCarga mensagem={lista.erro} onTentar={lista.recarregar} />
      ) : !lista.dados ? (
        <CarregandoBloco linhas={3} />
      ) : visiveis.length === 0 ? (
        <EmptyState
          title="Nenhuma locadora neste filtro"
          description="Troque a situação ou aguarde um novo cadastro."
          icon="✓"
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visiveis.map((l) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{l.nome}</CardTitle>
                      <Badge variant={STATUS[l.status].variante}>
                        {STATUS[l.status].rotulo}
                      </Badge>
                    </div>
                    <CardDesc>
                      CNPJ {formatarCnpj(l.cnpj)} ·{" "}
                      {[l.cidade, l.uf].filter(Boolean).join("/") ||
                        "cidade não informada"}
                    </CardDesc>
                    <p className="hint mt-1">
                      {l.email_contato} · pedido em {formatarDataHora(l.criado_em)} ·{" "}
                      {l.membros} {l.membros === 1 ? "conta" : "contas"}
                    </p>
                    <p className="hint">
                      Rede:{" "}
                      {l.receber_da_rede
                        ? "recebe incidentes confirmados"
                        : "não recebe da rede"}
                    </p>
                    {l.motivo_recusa ? (
                      <p className="hint">Motivo da recusa: {l.motivo_recusa}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {l.status !== "recusada" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ocupado === l.id}
                        onClick={() => {
                          setRecusando(recusando === l.id ? null : l.id);
                          setMotivo("");
                          setErro(null);
                        }}
                      >
                        Recusar
                      </Button>
                    ) : null}
                    {l.status !== "aprovada" ? (
                      <Button
                        size="sm"
                        disabled={ocupado === l.id}
                        onClick={() => void decidir(l, "aprovar")}
                      >
                        {ocupado === l.id ? "Salvando…" : "Aprovar"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {recusando === l.id ? (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      void decidir(l, "recusar");
                    }}
                  >
                    <Field label="Motivo da recusa" htmlFor={`motivo-${l.id}`} required>
                      <textarea
                        id={`motivo-${l.id}`}
                        autoFocus
                        className={controlClass("textarea")}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                    </Field>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setRecusando(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={ocupado === l.id}
                      >
                        Confirmar recusa
                      </Button>
                    </div>
                  </form>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
