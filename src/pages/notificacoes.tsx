import { useState } from "react";
import { Link } from "react-router-dom";
import { CartaoComunicado } from "@/components/comunicado";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarDataHora } from "@/lib/dominio";
import { atualizarNaoLidas, type Alerta, type Comunicado } from "@/lib/notificacoes";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Tabs,
  buttonClassName,
} from "@/ui";

type Aba = "alertas" | "novidades";

export default function Notificacoes() {
  useTitulo("Notificações · Histórico");
  const { perfil } = useSessao();
  const locadoraId = perfil?.locadora_ativa ?? null;
  const [escolhida, setEscolhida] = useState<Aba | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alertas = useCarga(locadoraId ? `notificacoes:${locadoraId}` : null, () =>
    rpc<Alerta[]>("listar_notificacoes", { p_limite: 50 }),
  );
  const novidades = useCarga(locadoraId ? `comunicados:${locadoraId}` : null, () =>
    rpc<Comunicado[]>("listar_comunicados", { p_limite: 30 }),
  );

  const alertasNovos = alertas.dados?.filter((a) => !a.lida).length ?? 0;
  const novidadesNovas = novidades.dados?.filter((c) => !c.lido).length ?? 0;
  // sem escolha explícita, abre onde há algo novo (alertas têm prazo, vêm antes)
  const aba: Aba = escolhida ?? (alertasNovos === 0 && novidadesNovas > 0 ? "novidades" : "alertas");

  async function executar(acao: () => Promise<unknown>) {
    setErro(null);
    setOcupado(true);
    try {
      await acao();
      alertas.recarregar();
      novidades.recarregar();
      void atualizarNaoLidas();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível atualizar as notificações."));
    } finally {
      setOcupado(false);
    }
  }

  const lerAlerta = (a: Alerta) =>
    a.lida ? undefined : void executar(() => rpc("marcar_notificacao_lida", { p_notificacao_id: a.id }));
  const lerComunicado = (c: Comunicado) =>
    c.lido ? undefined : void executar(() => rpc("marcar_comunicado_lido", { p_comunicado_id: c.id }));

  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Avisos"
        title="Notificações"
        description="Alertas dos seus incidentes e novidades da plataforma."
        actions={
          alertasNovos + novidadesNovas > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={ocupado}
              onClick={() => void executar(() => rpc("marcar_tudo_lido"))}
            >
              Marcar tudo como lido
            </Button>
          ) : undefined
        }
      />

      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      <Tabs
        label="Tipo de notificação"
        value={aba}
        onValueChange={(id) => setEscolhida(id as Aba)}
        tabs={[
          { id: "alertas", label: `Alertas${alertasNovos > 0 ? ` (${alertasNovos})` : ""}` },
          { id: "novidades", label: `Novidades${novidadesNovas > 0 ? ` (${novidadesNovas})` : ""}` },
        ]}
      />

      {aba === "alertas" ? (
        alertas.erro ? (
          <ErroCarga mensagem={alertas.erro} onTentar={alertas.recarregar} />
        ) : !alertas.dados ? (
          <CarregandoBloco linhas={2} />
        ) : alertas.dados.length === 0 ? (
          <EmptyState
            title="Nenhum alerta"
            description="Quando um incidente seu entrar na rede ou for contestado, o aviso aparece aqui."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {alertas.dados.map((a) => (
              <li key={a.id}>
                <Card className="notificacao-item flex flex-col gap-2" data-nao-lida={!a.lida || undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.tipo === "contestacao" || a.tipo === "recurso" ? (
                      <Badge variant="warning">Contestação</Badge>
                    ) : (
                      <Badge variant="success">Rede</Badge>
                    )}
                    {!a.lida ? <Badge variant="coin">Nova</Badge> : null}
                    <span className="hint ml-auto">{formatarDataHora(a.criado_em)}</span>
                  </div>
                  <h3 className="notificacao-titulo">{a.titulo}</h3>
                  {a.corpo ? <p className="text-sm">{a.corpo}</p> : null}
                  <div className="flex flex-wrap justify-end gap-2">
                    {!a.lida ? (
                      <Button variant="ghost" size="sm" disabled={ocupado} onClick={() => lerAlerta(a)}>
                        Marcar como lido
                      </Button>
                    ) : null}
                    {a.incidente_id ? (
                      <Link
                        to={`/incidente/${a.incidente_id}`}
                        className={buttonClassName("outline", "sm")}
                        onClick={() => lerAlerta(a)}
                      >
                        Ver incidente
                      </Link>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : novidades.erro ? (
        <ErroCarga mensagem={novidades.erro} onTentar={novidades.recarregar} />
      ) : !novidades.dados ? (
        <CarregandoBloco linhas={2} />
      ) : novidades.dados.length === 0 ? (
        <EmptyState
          title="Nenhuma novidade"
          description="Melhorias e avisos da plataforma aparecem aqui."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {novidades.dados.map((c) => (
            <li key={c.id}>
              <CartaoComunicado
                tipo={c.tipo}
                titulo={c.titulo}
                corpo={c.corpo}
                link={c.link}
                criadoEm={c.criado_em}
                naoLido={!c.lido}
                onAbrirLink={() => lerComunicado(c)}
                acoes={
                  !c.lido ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={ocupado}
                      onClick={() => lerComunicado(c)}
                    >
                      Marcar como lido
                    </Button>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
