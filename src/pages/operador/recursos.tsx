import { useState, type FormEvent } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { TIPOS, formatarDataHora, type TipoIncidente } from "@/lib/dominio";
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

type Recurso = {
  id: string;
  locadora_nome: string;
  placa: string;
  tipo: TipoIncidente;
  nome_titular: string;
  descricao: string;
  aberto_em: string;
  prazo_locadora_em: string;
};

export default function OperadorRecursos() {
  useTitulo("Recursos · Operação · Histórico");
  const recursos = useCarga("operador-recursos", () =>
    rpc<Recurso[]>("listar_contestacoes_recurso"),
  );
  const [aberto, setAberto] = useState<string | null>(null);
  const [procede, setProcede] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function decidir(r: Recurso) {
    setErro(null);
    setAviso(null);
    if (motivo.trim().length < 5) {
      setErro("A decisão exige motivo (ao menos 5 caracteres).");
      return;
    }
    setOcupado(r.id);
    try {
      await rpc("decidir_contestacao_recurso", {
        p_contestacao_id: r.id,
        p_procede: procede,
        p_motivo: motivo.trim(),
      });
      setAviso(
        `Recurso de ${r.placa} registrado (${procede ? "procedente" : "improcedente"}).`,
      );
      setAberto(null);
      setMotivo("");
      setProcede(false);
      recursos.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível registrar o recurso."));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Recursos de contestação"
        description="Só entra aqui o pedido cujo prazo da locadora (15 dias úteis) já venceu. A decisão devolve o incidente à rede ou o mantém fora dela."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {recursos.erro ? (
        <ErroCarga mensagem={recursos.erro} onTentar={recursos.recarregar} />
      ) : !recursos.dados ? (
        <CarregandoBloco linhas={2} />
      ) : recursos.dados.length === 0 ? (
        <EmptyState
          title="Sem recursos pendentes"
          description="Nenhuma contestação com prazo vencido."
          icon="✓"
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {recursos.dados.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle>
                      {r.placa} · {r.locadora_nome}
                    </CardTitle>
                    <CardDesc>
                      {TIPOS[r.tipo] ?? r.tipo} · titular {r.nome_titular}
                    </CardDesc>
                    <p className="hint mt-1">
                      Aberto em {formatarDataHora(r.aberto_em)} · prazo venceu em{" "}
                      {formatarDataHora(r.prazo_locadora_em)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={ocupado === r.id}
                    onClick={() => {
                      setAberto(aberto === r.id ? null : r.id);
                      setMotivo("");
                      setProcede(false);
                      setErro(null);
                    }}
                  >
                    Reavaliar
                  </Button>
                </div>

                <p className="whitespace-pre-line text-sm">{r.descricao}</p>

                {aberto === r.id ? (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      void decidir(r);
                    }}
                  >
                    <div
                      className="tabs grid grid-cols-2"
                      role="group"
                      aria-label="Resultado"
                    >
                      <button
                        type="button"
                        className="tab"
                        aria-pressed={!procede}
                        onClick={() => setProcede(false)}
                      >
                        Improcedente
                      </button>
                      <button
                        type="button"
                        className="tab"
                        aria-pressed={procede}
                        onClick={() => setProcede(true)}
                      >
                        Procedente
                      </button>
                    </div>
                    <Field
                      label="Motivo do recurso"
                      htmlFor={`recurso-${r.id}`}
                      required
                    >
                      <textarea
                        id={`recurso-${r.id}`}
                        autoFocus
                        rows={3}
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
                        onClick={() => setAberto(null)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={ocupado === r.id}>
                        {ocupado === r.id ? "Salvando…" : "Registrar recurso"}
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
