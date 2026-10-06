import { useState } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import { Alert, Button, Card, Metric, PageHeader } from "@/ui";

type Retencao = {
  suspeitas_elegiveis: number;
  fila_descarte: number;
  fila_com_falha: number;
  recursos_vencidos: number;
};

export default function OperadorRetencao() {
  useTitulo("Retenção · Operação · Histórico");
  const painel = useCarga("operador-retencao", () =>
    rpc<Retencao>("operador_retencao"),
  );
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const r = painel.dados;

  async function expurgar() {
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const total = await rpc<number>("operador_expurgar_suspeitas", { p_dias: 30 });
      setAviso(
        total === 0
          ? "Nenhuma suspeita elegível. Nada foi apagado."
          : `${total} suspeita(s) expurgada(s). O arquivo segue na fila de descarte.`,
      );
      setConfirmar(false);
      painel.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível expurgar."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Retenção"
        description="Suspeita sem confirmação e sem contestação sai após 30 dias. O número é a fila; o conteúdo da ficha não é listado. O job diário faz o mesmo sozinho."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {painel.erro ? (
        <ErroCarga mensagem={painel.erro} onTentar={painel.recarregar} />
      ) : null}

      {!r && painel.carregando ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CarregandoBloco key={i} linhas={1} />
          ))}
        </div>
      ) : r ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Metric
              label="Suspeitas elegíveis"
              value={r.suspeitas_elegiveis}
              tone={r.suspeitas_elegiveis > 0 ? "warning" : undefined}
            />
            <Metric label="Arquivos na fila" value={r.fila_descarte} />
            <Metric
              label="Descartes com falha"
              value={r.fila_com_falha}
              tone={r.fila_com_falha > 0 ? "destructive" : undefined}
            />
            <Metric label="Recursos vencidos" value={r.recursos_vencidos} />
          </div>

          <Card className="flex flex-col gap-3">
            <p className="font-semibold">Expurgar suspeitas vencidas</p>
            <p className="hint">
              Remove suspeita com mais de 30 dias e sem contestação. Confirmado e
              contestado ficam. A trilha guarda só a quantidade.
            </p>
            {confirmar ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={ocupado}
                  onClick={() => setConfirmar(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={ocupado || r.suspeitas_elegiveis === 0}
                  onClick={() => void expurgar()}
                >
                  {ocupado ? "Expurgando…" : "Confirmar expurgo"}
                </Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={r.suspeitas_elegiveis === 0}
                  onClick={() => setConfirmar(true)}
                >
                  Expurgar agora
                </Button>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
