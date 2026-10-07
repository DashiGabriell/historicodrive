import { useState, type FormEvent } from "react";
import { CartaoComunicado } from "@/components/comunicado";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarDataHora } from "@/lib/dominio";
import {
  CORPO_MAX,
  TIPOS_COMUNICADO,
  TITULO_MAX,
  erroDoComunicado,
  type ComunicadoAdmin,
  type TipoComunicado,
} from "@/lib/notificacoes";
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
  controlClass,
} from "@/ui";

type Painel = { destinatarios: number; itens: ComunicadoAdmin[] };

const TIPOS = Object.keys(TIPOS_COMUNICADO) as TipoComunicado[];

export default function OperadorComunicados() {
  useTitulo("Comunicados · Operação · Histórico");
  const painel = useCarga("operador-comunicados", () => rpc<Painel>("listar_comunicados_admin"));

  const [tipo, setTipo] = useState<TipoComunicado>("novidade");
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [link, setLink] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [retirando, setRetirando] = useState<string | null>(null);
  const [confirmarRetirada, setConfirmarRetirada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const destinatarios = painel.dados?.destinatarios ?? 0;
  const preenchido = titulo.trim() !== "" || corpo.trim() !== "";

  function revisar(evento: FormEvent) {
    evento.preventDefault();
    setAviso(null);
    const problema = erroDoComunicado({ titulo, corpo, link });
    setErro(problema);
    if (!problema) setConfirmando(true);
  }

  async function publicar() {
    setEnviando(true);
    setErro(null);
    try {
      await rpc<string>("publicar_comunicado", {
        p_tipo: tipo,
        p_titulo: titulo.trim(),
        p_corpo: corpo.trim(),
        p_link: link.trim() || null,
      });
      setAviso(`Comunicado enviado para ${destinatarios} ${destinatarios === 1 ? "conta" : "contas"}.`);
      setTitulo("");
      setCorpo("");
      setLink("");
      setTipo("novidade");
      setConfirmando(false);
      painel.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível enviar o comunicado."));
    } finally {
      setEnviando(false);
    }
  }

  async function retirar(id: string) {
    setRetirando(id);
    setErro(null);
    setAviso(null);
    try {
      await rpc("retirar_comunicado", { p_comunicado_id: id });
      setAviso("Comunicado retirado. Ele não aparece mais para os usuários.");
      setConfirmarRetirada(null);
      painel.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível retirar o comunicado."));
    } finally {
      setRetirando(null);
    }
  }

  return (
    <div className="container flex max-w-4xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Comunicados"
        description="Avise todos os donos de locadoras aprovadas sobre melhorias, manutenções e mudanças importantes. Aparece na tela de Notificações de cada um."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form className="flex flex-col gap-4" onSubmit={revisar} noValidate>
            <CardTitle>Novo comunicado</CardTitle>

            <div className="field">
              <span className="label">Tipo</span>
              <div className="tabs grid grid-cols-3" role="group" aria-label="Tipo do comunicado">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="tab"
                    aria-pressed={tipo === t}
                    onClick={() => {
                      setTipo(t);
                      setConfirmando(false);
                    }}
                  >
                    {TIPOS_COMUNICADO[t]}
                  </button>
                ))}
              </div>
            </div>

            <Field
              label="Título"
              htmlFor="comunicado-titulo"
              required
              hint={`${titulo.trim().length} de ${TITULO_MAX}`}
            >
              <input
                id="comunicado-titulo"
                className={controlClass()}
                maxLength={TITULO_MAX}
                placeholder="Nova tela de rascunhos"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setConfirmando(false);
                }}
              />
            </Field>

            <Field
              label="Texto"
              htmlFor="comunicado-corpo"
              required
              hint={`${corpo.trim().length} de ${CORPO_MAX}`}
            >
              <textarea
                id="comunicado-corpo"
                rows={5}
                className={controlClass("textarea")}
                maxLength={CORPO_MAX}
                placeholder="Agora você pode continuar registros que ficaram pela metade."
                value={corpo}
                onChange={(e) => {
                  setCorpo(e.target.value);
                  setConfirmando(false);
                }}
              />
            </Field>

            <Field
              label="Link (opcional)"
              htmlFor="comunicado-link"
              hint="Um caminho do app, como /rascunhos, ou um endereço https://."
            >
              <input
                id="comunicado-link"
                className={controlClass()}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="/rascunhos"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  setConfirmando(false);
                }}
              />
            </Field>

            {confirmando ? (
              <Alert variant="warning" className="flex-wrap items-center justify-between">
                <span>
                  Enviar para {destinatarios} {destinatarios === 1 ? "conta" : "contas"}? Não dá
                  para editar depois, só retirar.
                </span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmando(false)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={enviando}
                    onClick={() => void publicar()}
                  >
                    {enviando ? "Enviando…" : "Enviar agora"}
                  </Button>
                </span>
              </Alert>
            ) : (
              <div className="flex justify-end">
                <Button type="submit" disabled={!preenchido}>
                  Revisar e enviar
                </Button>
              </div>
            )}
          </form>
        </Card>

        <div className="flex flex-col gap-3">
          <p className="eyebrow">Pré-visualização</p>
          <CartaoComunicado
            tipo={tipo}
            titulo={titulo.trim() || "Título do comunicado"}
            corpo={corpo.trim() || "O texto aparece aqui, como o usuário vai ver."}
            link={link.trim() || null}
            criadoEm={null}
            naoLido
          />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Enviados</h2>
        {painel.erro ? (
          <ErroCarga mensagem={painel.erro} onTentar={painel.recarregar} />
        ) : !painel.dados ? (
          <CarregandoBloco linhas={2} />
        ) : painel.dados.itens.length === 0 ? (
          <EmptyState
            title="Nenhum comunicado enviado"
            description="O primeiro comunicado que você enviar aparece aqui, com quantas pessoas leram."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {painel.dados.itens.map((c) => (
              <li key={c.id}>
                <Card className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle>{c.titulo}</CardTitle>
                      <CardDesc>
                        {TIPOS_COMUNICADO[c.tipo]} · enviado em {formatarDataHora(c.criado_em)}
                      </CardDesc>
                    </div>
                    {c.retirado_em ? (
                      <Badge variant="secondary">Retirado</Badge>
                    ) : (
                      <Badge variant="success">Ativo</Badge>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-sm">{c.corpo}</p>
                  <p className="hint">
                    Lido por {c.leituras} de {destinatarios}
                    {c.link ? ` · link: ${c.link}` : ""}
                    {c.retirado_em ? ` · retirado em ${formatarDataHora(c.retirado_em)}` : ""}
                  </p>
                  {!c.retirado_em ? (
                    confirmarRetirada === c.id ? (
                      <Alert variant="warning" className="flex-wrap items-center justify-between">
                        <span>Retirar? Ele some da tela de todos os usuários.</span>
                        <span className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmarRetirada(null)}
                          >
                            Manter
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={retirando === c.id}
                            onClick={() => void retirar(c.id)}
                          >
                            Retirar
                          </Button>
                        </span>
                      </Alert>
                    ) : (
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmarRetirada(c.id)}
                        >
                          Retirar
                        </Button>
                      </div>
                    )
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
