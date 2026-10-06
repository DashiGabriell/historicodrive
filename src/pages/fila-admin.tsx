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

type Recurso = {
  id: string;
  incidente_id: string;
  locadora_nome: string;
  placa: string;
  tipo: string;
  estado_incidente: string;
  motorista_nome: string;
  nome_titular: string;
  descricao: string;
  aberto_em: string;
  prazo_locadora_em: string;
  estado: string;
};

export default function FilaAdmin() {
  useTitulo("Fila de aprovação · Histórico");

  const fila = useCarga("pendentes", () => rpc<Pendente[]>("listar_pendentes"));
  const recursos = useCarga("recursos", () =>
    rpc<Recurso[]>("listar_contestacoes_recurso"),
  );
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [recursoDecidindo, setRecursoDecidindo] = useState<string | null>(null);
  const [procede, setProcede] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function decidirRecurso(r: Recurso) {
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
      setRecursoDecidindo(null);
      setMotivo("");
      recursos.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível registrar o recurso."));
    } finally {
      setOcupado(null);
    }
  }

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

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Recursos de contestação</h2>
          <p className="hint">
            Pedidos cujo prazo da locadora (15 dias úteis) já venceu. O superadmin é o
            recurso de última instância.
          </p>
        </div>

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
                        {r.nome_titular} · {r.motorista_nome}
                      </CardDesc>
                      <p className="hint mt-1">
                        prazo venceu em {formatarDataHora(r.prazo_locadora_em)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ocupado === r.id}
                      onClick={() => {
                        setRecursoDecidindo(recursoDecidindo === r.id ? null : r.id);
                        setMotivo("");
                        setErro(null);
                      }}
                    >
                      Reavaliar
                    </Button>
                  </div>

                  <p className="whitespace-pre-line text-sm">{r.descricao}</p>

                  {recursoDecidindo === r.id ? (
                    <form
                      className="flex flex-col gap-3"
                      onSubmit={(e: FormEvent) => {
                        e.preventDefault();
                        void decidirRecurso(r);
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
                      <Field label="Motivo do recurso" htmlFor={`recurso-${r.id}`} required>
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
                          onClick={() => setRecursoDecidindo(null)}
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
      </section>
    </div>
  );
}
