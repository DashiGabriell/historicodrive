import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  CarregandoBloco,
  ConfiancaBadge,
  EstadoBadge,
  ErroCarga,
} from "@/components/dominio";
import { eImagem, formatarBytes, urlsAssinadas } from "@/lib/anexos";
import {
  CONFIANCAS,
  ESTADOS,
  TIPOS,
  cruzaARede,
  formatarDataHora,
  formatarMoeda,
  rotuloAcao,
  transicoesPermitidas,
  type Confianca,
  type Estado,
  type TipoIncidente,
} from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardDesc,
  CardTitle,
  Field,
  PageHeader,
  controlClass,
} from "@/ui";

type Detalhe = {
  id: string;
  placa: string;
  tipo: TipoIncidente;
  valor: number | null;
  descricao: string;
  estado: Estado;
  confianca: Confianca;
  motivo: string | null;
  criado_em: string;
  atualizado_em: string;
  visivel_na_rede: boolean;
  visivel_na_rede_desde: string | null;
  criado_por_nome: string | null;
  motorista: { id: string; nome_completo: string; cpf_mascarado: string };
  anexos: Array<{
    id: string;
    caminho: string;
    content_type: string | null;
    bytes: number | null;
    hash: string | null;
  }>;
  contestacoes: Array<{
    id: string;
    estado: "aberta" | "procedente" | "improcedente";
    aberto_em: string;
    prazo_locadora_em: string;
    descricao: string;
    motivo: string | null;
  }>;
  historico: Array<{
    id: number;
    acao: string;
    ator_nome: string | null;
    antes: Record<string, unknown> | null;
    depois: Record<string, unknown> | null;
    criado_em: string;
  }>;
};

export default function Incidente() {
  useTitulo("Incidente · Histórico");

  const { id = "" } = useParams();
  const local = useLocation();
  const { perfil } = useSessao();
  const recemCriado = (local.state as { criado?: boolean } | null)?.criado === true;

  const detalhe = useCarga(`incidente:${perfil?.locadora_ativa}:${id}`, () =>
    rpc<Detalhe>("detalhe_incidente", { p_incidente_id: id }),
  );
  const caminhos = detalhe.dados?.anexos.map((a) => a.caminho) ?? [];
  const urls = useCarga(caminhos.length ? `urls:${caminhos.join("|")}` : null, () =>
    urlsAssinadas(caminhos),
  );

  const [novoEstado, setNovoEstado] = useState<Estado | null>(null);
  const [confianca, setConfianca] = useState<Confianca>("media");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  if (detalhe.erro) {
    return (
      <div className="container flex flex-col gap-4 py-16">
        <ErroCarga mensagem={detalhe.erro} onTentar={detalhe.recarregar} />
        <ButtonLink href="/painel" variant="outline" className="self-start">
          Voltar ao painel
        </ButtonLink>
      </div>
    );
  }

  if (!detalhe.dados) {
    return (
      <div className="container flex flex-col gap-4 py-6 sm:py-10">
        <CarregandoBloco linhas={2} />
        <CarregandoBloco linhas={4} />
      </div>
    );
  }

  const inc = detalhe.dados;
  const opcoes = transicoesPermitidas(inc.estado);

  function abrirTransicao(estado: Estado) {
    setNovoEstado(estado);
    setConfianca(inc.confianca);
    setMotivo("");
    setErro(null);
    setSucesso(null);
  }

  async function transicionar(evento: FormEvent) {
    evento.preventDefault();
    if (!novoEstado) return;
    if (motivo.trim().length < 5) {
      setErro("Informe o motivo (ao menos 5 caracteres).");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await rpc("mudar_estado_incidente", {
        p_incidente_id: inc.id,
        p_novo_estado: novoEstado,
        p_motivo: motivo.trim(),
        p_confianca: confianca,
      });
      setSucesso(`Incidente marcado como ${ESTADOS[novoEstado].toLowerCase()}.`);
      setNovoEstado(null);
      detalhe.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível mudar o estado."));
    } finally {
      setSalvando(false);
    }
  }

  const naRede = cruzaARede(inc.estado, inc.confianca);
  const vaiParaRede = novoEstado ? cruzaARede(novoEstado, confianca) : false;

  return (
    <div className="container flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <PageHeader
        eyebrow={`Incidente · placa ${inc.placa}`}
        title={TIPOS[inc.tipo]}
        description={
          <>
            Motorista{" "}
            <Link
              to={`/motorista/${inc.motorista.id}`}
              className="font-semibold text-primary"
            >
              {inc.motorista.nome_completo}
            </Link>{" "}
            · CPF {inc.motorista.cpf_mascarado}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <EstadoBadge estado={inc.estado} />
            <ConfiancaBadge confianca={inc.confianca} />
          </div>
        }
      />

      {recemCriado && !sucesso ? (
        <Alert variant="success">
          <span>
            <strong>Incidente registrado.</strong> Ele está como suspeita e só a sua
            locadora vê.
          </span>
        </Alert>
      ) : null}
      {sucesso ? <Alert variant="success">{sucesso}</Alert> : null}

      <Alert variant={naRede ? "info" : "warning"}>
        {naRede
          ? "Visível para a rede: confirmado com confiança alta. As outras locadoras veem tipo, data, descrição, valor e estado — nunca os anexos."
          : "Privado: só a sua locadora vê este registro. Para cruzar a rede ele precisa estar confirmado com confiança alta."}
      </Alert>

      {inc.visivel_na_rede && inc.visivel_na_rede_desde ? (
        <Alert variant="info">
          <span>
            <strong>Na rede desde {formatarDataHora(inc.visivel_na_rede_desde)}.</strong>{" "}
            Prova de visibilidade: audit_log (incidente.confirmado + confiança alta).
          </span>
        </Alert>
      ) : null}

      {inc.contestacoes.length > 0 ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Contestações ({inc.contestacoes.length})</CardTitle>
          <ul className="flex flex-col gap-2">
            {inc.contestacoes.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="label">{c.estado}</span> · aberta em{" "}
                {formatarDataHora(c.aberto_em)} · prazo da locadora até{" "}
                {formatarDataHora(c.prazo_locadora_em)}
                {c.motivo ? <span className="hint"> · {c.motivo}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="flex flex-col gap-4">
            <CardTitle>Descrição</CardTitle>
            <p className="whitespace-pre-line">{inc.descricao}</p>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="hint">Prejuízo</dt>
                <dd className="label">{formatarMoeda(inc.valor)}</dd>
              </div>
              <div>
                <dt className="hint">Registrado por</dt>
                <dd className="label">{inc.criado_por_nome ?? "—"}</dd>
              </div>
              <div>
                <dt className="hint">Registrado em</dt>
                <dd className="label">{formatarDataHora(inc.criado_em)}</dd>
              </div>
            </dl>
            {inc.motivo ? (
              <p className="hint">
                <strong>Motivo da última mudança:</strong> {inc.motivo}
              </p>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <CardTitle>Anexos ({inc.anexos.length})</CardTitle>
              <CardDesc>
                Links temporários de 1 hora. Nunca saem da sua locadora.
              </CardDesc>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {inc.anexos.map((a, i) => {
                const url = urls.dados?.[a.caminho];
                return (
                  <li key={a.id} className="flex flex-col gap-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="anexo-thumb grid place-items-center"
                      aria-label={`Abrir anexo ${i + 1}`}
                    >
                      {url && eImagem(a.content_type, a.caminho) ? (
                        <img src={url} alt={`Anexo ${i + 1}`} />
                      ) : (
                        <span className="label">
                          {url ? "Abrir PDF" : "Carregando…"}
                        </span>
                      )}
                    </a>
                    <span className="hint">{formatarBytes(a.bytes)}</span>
                    {a.hash ? (
                      <span className="hint truncate" title={`SHA-256: ${a.hash}`}>
                        sha {a.hash.slice(0, 12)}…
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <div>
              <CardTitle>Mudar estado</CardTitle>
              <CardDesc>
                Nada se apaga: toda mudança exige motivo e fica na auditoria.
              </CardDesc>
            </div>
            <div className="flex flex-wrap gap-2">
              {opcoes.map((estado) => (
                <Button
                  key={estado}
                  size="sm"
                  variant={
                    novoEstado === estado
                      ? "primary"
                      : estado === "confirmado"
                        ? "destructive"
                        : "outline"
                  }
                  onClick={() => abrirTransicao(estado)}
                >
                  {estado === "confirmado" ? "Confirmar" : "Contestar"}
                </Button>
              ))}
            </div>

            {novoEstado ? (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => void transicionar(e)}
              >
                <Field label="Confiança" htmlFor="confianca-nova">
                  <select
                    id="confianca-nova"
                    className={controlClass("select")}
                    value={confianca}
                    onChange={(e) => setConfianca(e.target.value as Confianca)}
                  >
                    {(Object.keys(CONFIANCAS) as Confianca[]).map((c) => (
                      <option key={c} value={c}>
                        {CONFIANCAS[c]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Motivo"
                  htmlFor="motivo"
                  hint="Mínimo de 5 caracteres"
                  required
                >
                  <textarea
                    id="motivo"
                    className={controlClass("textarea")}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </Field>
                {vaiParaRede !== naRede ? (
                  <Alert variant={vaiParaRede ? "info" : "warning"}>
                    {vaiParaRede
                      ? "Com isso o incidente passa a ser visível para a rede."
                      : "Com isso o incidente deixa de ser visível para a rede."}
                  </Alert>
                ) : null}
                {erro ? <Alert variant="destructive">{erro}</Alert> : null}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setNovoEstado(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={salvando}>
                    {salvando
                      ? "Salvando…"
                      : `Marcar como ${ESTADOS[novoEstado].toLowerCase()}`}
                  </Button>
                </div>
              </form>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>Histórico</CardTitle>
            <ol className="flex flex-col gap-3">
              {inc.historico.map((h) => (
                <li key={h.id} className="flex flex-col gap-0.5">
                  <span className="label">{rotuloAcao(h.acao)}</span>
                  <span className="hint">
                    {h.ator_nome ?? "Sistema"} · {formatarDataHora(h.criado_em)}
                  </span>
                  {typeof h.depois?.motivo === "string" ? (
                    <span className="hint">“{h.depois.motivo}”</span>
                  ) : null}
                </li>
              ))}
            </ol>
            <Link to="/auditoria" className="text-sm font-semibold text-primary">
              Ver auditoria completa →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
