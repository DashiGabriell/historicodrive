import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CarregandoBloco, ErroCarga, EstadoBadge } from "@/components/dominio";
import { TIPOS, formatarDataHora, type Estado, type TipoIncidente } from "@/lib/dominio";
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

type Contestacao = {
  id: string;
  incidente_id: string;
  placa: string;
  tipo: TipoIncidente;
  estado_incidente: Estado;
  motorista_nome: string;
  nome_titular: string;
  email_titular: string;
  descricao: string;
  aberto_em: string;
  prazo_locadora_em: string;
  estado: "aberta" | "procedente" | "improcedente";
  motivo: string | null;
};

export default function Contestacoes() {
  useTitulo("Contestações · Histórico");

  const fila = useCarga("contestacoes", () => rpc<Contestacao[]>("listar_contestacoes"));
  const [decidindo, setDecidindo] = useState<string | null>(null);
  const [procede, setProcede] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function decidir(c: Contestacao) {
    setErro(null);
    setAviso(null);
    if (motivo.trim().length < 5) {
      setErro("A decisão exige motivo (ao menos 5 caracteres).");
      return;
    }
    setOcupado(c.id);
    try {
      await rpc("decidir_contestacao", {
        p_contestacao_id: c.id,
        p_procede: procede,
        p_motivo: motivo.trim(),
      });
      setAviso(
        procede
          ? "Contestação marcada como procedente. O registro permanece contestado."
          : "Contestação improcedente. O incidente volta a confirmado.",
      );
      setDecidindo(null);
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
        eyebrow="Defesa legal"
        title="Contestações abertas"
        description="Pedidos do titular. Responda em até 15 dias úteis; depois disso o superadmin pode decidir o recurso."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {fila.erro ? (
        <ErroCarga mensagem={fila.erro} onTentar={fila.recarregar} />
      ) : !fila.dados ? (
        <CarregandoBloco linhas={3} />
      ) : fila.dados.length === 0 ? (
        <EmptyState
          title="Sem contestações"
          description="Nenhum titular abriu pedido contra os seus incidentes."
          icon="⚖"
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {fila.dados.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle>
                      {TIPOS[c.tipo]} · placa {c.placa}
                    </CardTitle>
                    <CardDesc>
                      {c.nome_titular} · {c.email_titular}
                    </CardDesc>
                    <p className="hint mt-1">
                      aberto em {formatarDataHora(c.aberto_em)} · prazo até{" "}
                      {formatarDataHora(c.prazo_locadora_em)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EstadoBadge estado={c.estado_incidente} />
                    <Link
                      to={`/incidente/${c.incidente_id}`}
                      className="link-acao"
                    >
                      Ver incidente
                    </Link>
                  </div>
                </div>

                <p className="whitespace-pre-line text-sm">{c.descricao}</p>

                {c.estado !== "aberta" ? (
                  <Alert variant="info">
                    Decidida como {c.estado}
                    {c.motivo ? `: ${c.motivo}` : ""}.
                  </Alert>
                ) : decidindo === c.id ? (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      void decidir(c);
                    }}
                  >
                    <div className="tabs grid grid-cols-2" role="group" aria-label="Resultado">
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
                    <Field label="Motivo da decisão" htmlFor={`motivo-${c.id}`} required>
                      <textarea
                        id={`motivo-${c.id}`}
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
                        onClick={() => setDecidindo(null)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" size="sm" disabled={ocupado === c.id}>
                        {ocupado === c.id ? "Salvando…" : "Registrar decisão"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={ocupado === c.id}
                      onClick={() => {
                        setDecidindo(c.id);
                        setMotivo("");
                        setErro(null);
                      }}
                    >
                      Responder
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
