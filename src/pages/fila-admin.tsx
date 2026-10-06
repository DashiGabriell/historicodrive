import { useState, type FormEvent } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarCnpj, formatarDataHora } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Button,
  Card,
  CardDesc,
  CardTitle,
  EmptyState,
  Field,
  PageHeader,
  controlClass,
} from "@/ui";

type Pendente = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  email_contato: string;
  criado_em: string;
};

export default function FilaAdmin() {
  useTitulo("Fila de aprovação · HistóricoDrive");

  const fila = useCarga("pendentes", () => rpc<Pendente[]>("listar_pendentes"));
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function decidir(locadora: Pendente, acao: "aprovar" | "recusar") {
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
      fila.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível registrar a decisão."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Superadmin"
        title="Fila de aprovação"
        description="Locadoras que pediram acesso à rede. Aprovar libera o dono para operar; recusar exige motivo."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {fila.erro ? (
        <ErroCarga mensagem={fila.erro} onTentar={fila.recarregar} />
      ) : !fila.dados ? (
        <CarregandoBloco linhas={3} />
      ) : fila.dados.length === 0 ? (
        <EmptyState
          title="Fila vazia"
          description="Nenhuma locadora aguardando aprovação."
          icon="✓"
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {fila.dados.map((l) => (
            <li key={l.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>{l.nome}</CardTitle>
                    <CardDesc>
                      CNPJ {formatarCnpj(l.cnpj)} ·{" "}
                      {[l.cidade, l.uf].filter(Boolean).join("/") ||
                        "cidade não informada"}
                    </CardDesc>
                    <p className="hint mt-1">
                      {l.email_contato} · pedido em {formatarDataHora(l.criado_em)}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                    <Button
                      size="sm"
                      disabled={ocupado === l.id}
                      onClick={() => void decidir(l, "aprovar")}
                    >
                      {ocupado === l.id ? "Salvando…" : "Aprovar"}
                    </Button>
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
