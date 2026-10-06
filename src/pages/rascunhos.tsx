import { useState } from "react";
import { removerAnexo } from "@/lib/anexos";
import { TIPOS, formatarCentavos, formatarDataHora } from "@/lib/dominio";
import { normalizarRascunho, pendencias, type RascunhoIncidente } from "@/lib/incidente-rascunho";
import { apagarRascunho, listarRascunhos } from "@/lib/rascunho";
import { useSessao } from "@/lib/sessao-contexto";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardDesc,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/ui";

type Item = { id: string; atualizadoEm: string; rascunho: RascunhoIncidente };

function carregar(locadoraId: string): Item[] {
  return listarRascunhos(locadoraId).map((item) => ({
    id: item.id,
    atualizadoEm: item.atualizadoEm,
    rascunho: normalizarRascunho(item.dados),
  }));
}

function quemE(r: RascunhoIncidente): string {
  if (r.motorista) return r.motorista.nome;
  if (r.nome.trim()) return r.nome.trim();
  if (r.cpf) return `CPF ${r.cpf}`;
  return "Motorista não informado";
}

export default function Rascunhos() {
  useTitulo("Rascunhos · Histórico");
  const { perfil } = useSessao();
  const locadoraId = perfil?.locadora_ativa;
  if (!locadoraId) return null;
  return <Lista key={locadoraId} locadoraId={locadoraId} />;
}

function Lista({ locadoraId }: { locadoraId: string }) {
  const [itens, setItens] = useState(() => carregar(locadoraId));
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [descartando, setDescartando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function descartar(item: Item) {
    setDescartando(item.id);
    apagarRascunho(locadoraId, item.id);
    setItens(carregar(locadoraId));
    setConfirmando(null);
    setAviso("Rascunho descartado.");
    await Promise.allSettled(item.rascunho.anexos.map((a) => removerAnexo(a.caminho)));
    setDescartando(null);
  }

  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Registros em andamento"
        title="Rascunhos"
        description="Incidentes que começaram a ser registrados e ainda não foram enviados. Continue de onde parou."
        actions={<ButtonLink href="/incidente/novo">Novo registro</ButtonLink>}
      />

      <Alert variant="info">
        <span>
          <strong>Os rascunhos ficam só nesta aba.</strong> Por privacidade, eles somem ao
          fechar o navegador ou sair da conta, porque contêm CPF e dados do motorista.
          Conclua antes de encerrar o expediente.
        </span>
      </Alert>

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}

      {itens.length === 0 ? (
        <EmptyState
          title="Nenhum rascunho"
          description="Quando você começar um registro e sair antes de enviar, ele aparece aqui."
          action={
            <ButtonLink href="/incidente/novo" size="sm">
              Registrar incidente
            </ButtonLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {itens.map((item) => {
            const { rascunho: r } = item;
            const faltas = pendencias(r);
            return (
              <li key={item.id}>
                <Card className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle>{quemE(r)}</CardTitle>
                      <CardDesc>
                        {TIPOS[r.tipo]}
                        {r.placa ? ` · placa ${r.placa}` : ""}
                        {r.valorCentavos ? ` · R$ ${formatarCentavos(r.valorCentavos)}` : ""}
                      </CardDesc>
                      <p className="hint mt-1">
                        Editado em {formatarDataHora(item.atualizadoEm)} · {r.anexos.length}{" "}
                        anexo{r.anexos.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Badge variant={faltas.length === 0 ? "success" : "warning"}>
                      {faltas.length === 0
                        ? "Pronto para enviar"
                        : `Falta${faltas.length > 1 ? "m" : ""} ${faltas.length} item${faltas.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>

                  {faltas.length > 0 ? (
                    <ul className="flex list-disc flex-col gap-1 pl-5">
                      {faltas.map((falta) => (
                        <li key={falta} className="hint">
                          {falta}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {confirmando === item.id ? (
                    <Alert variant="warning" className="flex-wrap items-center justify-between">
                      <span>Descartar este rascunho? As fotos enviadas também serão apagadas.</span>
                      <span className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setConfirmando(null)}>
                          Manter
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={descartando === item.id}
                          onClick={() => void descartar(item)}
                        >
                          Descartar
                        </Button>
                      </span>
                    </Alert>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAviso(null);
                          setConfirmando(item.id);
                        }}
                      >
                        Descartar
                      </Button>
                      <ButtonLink
                        href={`/incidente/novo?rascunho=${encodeURIComponent(item.id)}`}
                        size="sm"
                      >
                        Continuar edição
                      </ButtonLink>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
