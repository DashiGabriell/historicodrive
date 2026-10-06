import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  TAMANHO_MAXIMO,
  TIPOS_ACEITOS,
  eImagem,
  enviarAnexo,
  formatarBytes,
  removerAnexo,
  urlsAssinadas,
  type AnexoEnviado,
} from "@/lib/anexos";
import {
  CONFIANCAS,
  MAX_ANEXOS,
  TIPOS,
  cpfValido,
  formatarCpf,
  normalizarPlaca,
  placaValida,
  somenteDigitos,
  type Confianca,
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

type Rascunho = {
  passo: 1 | 2;
  anexos: AnexoEnviado[];
  motorista: { id: string; nome: string } | null;
  cpf: string;
  nome: string;
  nascimento: string;
  placa: string;
  tipo: TipoIncidente;
  valor: string;
  confianca: Confianca;
  descricao: string;
};

type Origem = {
  cpf?: string;
  nome?: string;
  motorista?: { id: string; nome: string };
} | null;

const chaveRascunho = (locadoraId: string) => `hd.rascunho.${locadoraId}`;

function rascunhoInicial(locadoraId: string, origem: Origem): Rascunho {
  const vazio: Rascunho = {
    passo: 1,
    anexos: [],
    motorista: null,
    cpf: "",
    nome: "",
    nascimento: "",
    placa: "",
    tipo: "dano_veiculo",
    valor: "",
    confianca: "media",
    descricao: "",
  };

  let salvo: Partial<Rascunho> = {};
  try {
    salvo = JSON.parse(localStorage.getItem(chaveRascunho(locadoraId)) ?? "{}");
  } catch {
    salvo = {};
  }

  const base = { ...vazio, ...salvo };
  if (origem?.motorista) return { ...base, motorista: origem.motorista };
  if (origem?.cpf) return { ...base, motorista: null, cpf: formatarCpf(origem.cpf) };
  if (origem?.nome) return { ...base, motorista: null, nome: origem.nome };
  return base;
}

export default function IncidenteNovo() {
  useTitulo("Registrar incidente · HistóricoDrive");
  const { perfil } = useSessao();
  const locadoraId = perfil?.locadora_ativa;
  if (!locadoraId) return null;
  // trocar de locadora descarta o formulario: os anexos sao da pasta da anterior
  return <Formulario key={locadoraId} locadoraId={locadoraId} />;
}

function Formulario({ locadoraId }: { locadoraId: string }) {
  const local = useLocation();
  const navegar = useNavigate();
  const [r, setR] = useState(() => rascunhoInicial(locadoraId, local.state as Origem));
  const [enviandoArquivos, setEnviandoArquivos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    localStorage.setItem(chaveRascunho(locadoraId), JSON.stringify(r));
  }, [locadoraId, r]);

  const caminhos = r.anexos.map((a) => a.caminho);
  const previas = useCarga(
    caminhos.length ? `previas:${caminhos.join("|")}` : null,
    () => urlsAssinadas(caminhos),
  );

  function atualizar<K extends keyof Rascunho>(campo: K, valor: Rascunho[K]) {
    setR((atual) => ({ ...atual, [campo]: valor }));
  }

  async function escolherArquivos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.target.files ?? []);
    evento.target.value = "";
    setErro(null);

    const vagas = MAX_ANEXOS - r.anexos.length;
    if (arquivos.length > vagas) {
      setErro(
        `Máximo de ${MAX_ANEXOS} anexos. Só os primeiros ${vagas} foram considerados.`,
      );
    }

    for (const arquivo of arquivos.slice(0, Math.max(vagas, 0))) {
      if (arquivo.size > TAMANHO_MAXIMO) {
        setErro(`${arquivo.name} passa de 10 MB.`);
        continue;
      }
      setEnviandoArquivos((n) => n + 1);
      try {
        const anexo = await enviarAnexo(locadoraId, arquivo);
        setR((atual) => ({ ...atual, anexos: [...atual.anexos, anexo] }));
      } catch (causa) {
        setErro(mensagemDe(causa, `Falha ao enviar ${arquivo.name}.`));
      } finally {
        setEnviandoArquivos((n) => n - 1);
      }
    }
  }

  async function tirarAnexo(caminho: string) {
    setR((atual) => ({
      ...atual,
      anexos: atual.anexos.filter((a) => a.caminho !== caminho),
    }));
    await removerAnexo(caminho);
  }

  function validar(): string | null {
    if (r.anexos.length < 1) return "Envie ao menos uma foto ou documento.";
    if (!r.motorista) {
      if (!cpfValido(r.cpf)) return "CPF do motorista inválido.";
      if (r.nome.trim().length < 5 || r.nome.trim().split(/\s+/).length < 2) {
        return "Informe o nome completo do motorista.";
      }
    }
    if (!placaValida(r.placa)) return "Placa inválida. Use ABC-1234 ou ABC1D23.";
    if (r.valor !== "" && (Number.isNaN(Number(r.valor)) || Number(r.valor) < 0)) {
      return "Valor inválido.";
    }
    if (r.descricao.trim().length < 10)
      return "A descrição precisa de ao menos 10 caracteres.";
    return null;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validar();
    setErro(problema);
    if (problema) return;

    setSalvando(true);
    try {
      const motoristaId =
        r.motorista?.id ??
        (await rpc<string>("criar_ou_localizar_motorista", {
          p_cpf: somenteDigitos(r.cpf),
          p_nome_completo: r.nome.trim(),
          p_nascimento: r.nascimento || null,
        }));

      const id = await rpc<string>("criar_incidente", {
        p_motorista_id: motoristaId,
        p_placa: normalizarPlaca(r.placa),
        p_tipo: r.tipo,
        p_descricao: r.descricao.trim(),
        p_valor: r.valor === "" ? null : Number(r.valor),
        p_confianca: r.confianca,
        p_anexos: r.anexos.map(({ caminho, content_type, bytes }) => ({
          caminho,
          content_type,
          bytes,
        })),
      });

      localStorage.removeItem(chaveRascunho(locadoraId));
      navegar(`/incidente/${id}`, { replace: true, state: { criado: true } });
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível registrar o incidente."));
      setSalvando(false);
    }
  }

  async function descartar() {
    const anexos = r.anexos;
    localStorage.removeItem(chaveRascunho(locadoraId));
    setR(rascunhoInicial(locadoraId, null));
    await Promise.all(anexos.map((a) => removerAnexo(a.caminho)));
  }

  const temRascunho = r.anexos.length > 0 || r.descricao !== "" || r.placa !== "";

  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Novo registro"
        title="Registrar incidente"
        description="Fotos primeiro: a prova fica salva mesmo se a conexão cair. O rascunho volta se você recarregar a página."
        actions={
          temRascunho ? (
            <Button variant="ghost" size="sm" onClick={() => void descartar()}>
              Descartar rascunho
            </Button>
          ) : null
        }
      />

      <ol className="flex flex-wrap gap-6" aria-label="Passos">
        {["Fotos e documentos", "Motorista e fato"].map((rotulo, i) => (
          <li
            key={rotulo}
            className="step flex items-center gap-2"
            aria-current={r.passo === i + 1 ? "step" : undefined}
          >
            <span className="step-num">{i + 1}</span>
            {rotulo}
          </li>
        ))}
      </ol>

      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {r.passo === 1 ? (
        <Card className="flex flex-col gap-5">
          <div>
            <CardTitle>Fotos e documentos</CardTitle>
            <CardDesc>
              De 1 a {MAX_ANEXOS} arquivos (imagem ou PDF, até 10 MB). Ficam num
              armazenamento privado da sua locadora e nunca são mostrados à rede.
            </CardDesc>
          </div>

          {r.anexos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {r.anexos.map((a) => {
                const url = previas.dados?.[a.caminho];
                return (
                  <li key={a.caminho} className="flex flex-col gap-2">
                    <div className="anexo-thumb grid place-items-center">
                      {url && eImagem(a.content_type, a.caminho) ? (
                        <img src={url} alt={a.nome} />
                      ) : (
                        <span className="label">
                          {a.content_type.includes("pdf") ? "PDF" : "Arquivo"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="hint truncate" title={a.nome}>
                        {formatarBytes(a.bytes)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void tirarAnexo(a.caminho)}
                        aria-label={`Remover ${a.nome}`}
                      >
                        Remover
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label
              className={`btn btn-outline ${r.anexos.length >= MAX_ANEXOS ? "pointer-events-none opacity-50" : ""}`}
            >
              {r.anexos.length === 0
                ? "Tirar foto ou escolher arquivo"
                : "Adicionar mais"}
              <input
                type="file"
                accept={TIPOS_ACEITOS}
                capture="environment"
                multiple
                className="sr-only"
                disabled={r.anexos.length >= MAX_ANEXOS}
                onChange={(e) => void escolherArquivos(e)}
              />
            </label>
            <span className="hint">
              {enviandoArquivos > 0
                ? `Enviando ${enviandoArquivos} arquivo(s)…`
                : `${r.anexos.length} de ${MAX_ANEXOS}`}
            </span>
          </div>

          <div className="acoes-fixas flex justify-between gap-2">
            <ButtonLink href="/painel" variant="ghost">
              Cancelar
            </ButtonLink>
            <Button
              disabled={r.anexos.length < 1 || enviandoArquivos > 0}
              onClick={() => {
                setErro(null);
                atualizar("passo", 2);
              }}
            >
              Continuar
            </Button>
          </div>
        </Card>
      ) : (
        <form className="flex flex-col gap-6" onSubmit={(e) => void enviar(e)}>
          <Card className="flex flex-col gap-4">
            <CardTitle>Motorista</CardTitle>
            {r.motorista ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong>{r.motorista.nome}</strong>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => atualizar("motorista", null)}
                >
                  Trocar motorista
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="CPF"
                  htmlFor="cpf"
                  hint="Sem CPF não se cria ficha"
                  required
                >
                  <input
                    id="cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    className={controlClass("input")}
                    value={r.cpf}
                    onChange={(e) => atualizar("cpf", formatarCpf(e.target.value))}
                  />
                </Field>
                <Field label="Data de nascimento" htmlFor="nascimento">
                  <input
                    id="nascimento"
                    type="date"
                    className={controlClass("input")}
                    value={r.nascimento}
                    onChange={(e) => atualizar("nascimento", e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    label="Nome completo"
                    htmlFor="nome"
                    hint="Como está no documento. Se o CPF já existir, o nome precisa bater."
                    required
                  >
                    <input
                      id="nome"
                      autoComplete="off"
                      autoCapitalize="words"
                      autoCorrect="off"
                      spellCheck={false}
                      className={controlClass("input")}
                      value={r.nome}
                      onChange={(e) => atualizar("nome", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <CardTitle>O que aconteceu</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Placa do veículo"
                htmlFor="placa"
                hint="ABC-1234 ou ABC1D23"
                required
              >
                <input
                  id="placa"
                  autoComplete="off"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  className={controlClass("input")}
                  value={r.placa}
                  maxLength={8}
                  onChange={(e) => atualizar("placa", e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Tipo" htmlFor="tipo" required>
                <select
                  id="tipo"
                  className={controlClass("select")}
                  value={r.tipo}
                  onChange={(e) => atualizar("tipo", e.target.value as TipoIncidente)}
                >
                  {(Object.keys(TIPOS) as TipoIncidente[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPOS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Prejuízo (R$)"
                htmlFor="valor"
                hint="Deixe vazio se ainda não souber"
              >
                <input
                  id="valor"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className={controlClass("input")}
                  value={r.valor}
                  onChange={(e) => atualizar("valor", e.target.value)}
                />
              </Field>
              <Field label="Confiança" htmlFor="confianca">
                <select
                  id="confianca"
                  className={controlClass("select")}
                  value={r.confianca}
                  onChange={(e) => atualizar("confianca", e.target.value as Confianca)}
                >
                  {(Object.keys(CONFIANCAS) as Confianca[]).map((c) => (
                    <option key={c} value={c}>
                      {CONFIANCAS[c]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Descrição"
              htmlFor="descricao"
              hint="Mínimo de 10 caracteres"
              required
            >
              <textarea
                id="descricao"
                autoCapitalize="sentences"
                className={controlClass("textarea")}
                value={r.descricao}
                onChange={(e) => atualizar("descricao", e.target.value)}
              />
            </Field>
          </Card>

          <Alert variant="warning">
            <span>
              <strong>Todo incidente nasce como suspeita.</strong> Só a sua locadora vê.
              Ele entra na rede apenas quando você confirmar com confiança alta.
            </span>
          </Alert>

          <div className="acoes-fixas flex justify-between gap-2">
            <Button variant="ghost" onClick={() => atualizar("passo", 1)}>
              Voltar às fotos
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Registrando…" : "Registrar incidente"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
