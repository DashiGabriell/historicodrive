import { useState, type FormEvent } from "react";
import { TIPOS, type Estado, type TipoIncidente } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
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

type IncidenteTitular = {
  id: string;
  tipo: TipoIncidente;
  estado: Estado;
  criado_em: string;
  locadora_nome: string;
  tem_contestacao_aberta: boolean;
};

type Consulta = {
  existe: boolean;
  incidentes: IncidenteTitular[];
};

const ERRO_GENERICO = "CPF não confere com nenhum registro. Confira os 11 dígitos.";

export default function Contestar() {
  useTitulo("Contestação · Histórico");

  const [cpf, setCpf] = useState("");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [escolhido, setEscolhido] = useState<IncidenteTitular | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  async function consultar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      const r = await rpc<Consulta>("consultar_ficha_contestacao", { p_cpf: cpf });
      setConsulta(r);
      if (!r.existe) setErro(ERRO_GENERICO);
    } catch (causa) {
      setErro(mensagemDe(causa, ERRO_GENERICO));
    } finally {
      setOcupado(false);
    }
  }

  async function abrir(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) return;
    setErro(null);
    setOcupado(true);
    try {
      const id = await rpc<string>("abrir_contestacao", {
        p_incidente_id: escolhido.id,
        p_cpf: cpf,
        p_nome: nome.trim(),
        p_email: email.trim(),
        p_descricao: descricao.trim(),
      });
      setProtocolo(id);
      setEscolhido(null);
      setConsulta(null);
      setCpf("");
      setNome("");
      setEmail("");
      setDescricao("");
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível abrir a contestação."));
    } finally {
      setOcupado(false);
    }
  }

  if (protocolo) {
    return (
      <div className="container flex max-w-2xl flex-col gap-6 py-6 sm:py-10">
        <PageHeader
          eyebrow="Contestação"
          title="Pedido aberto"
          description="A locadora tem 15 dias úteis para responder. O registro sai da rede enquanto estiver contestado."
        />
        <Card className="flex flex-col gap-3">
          <CardTitle>Protocolo</CardTitle>
          <code className="break-all text-sm">{protocolo}</code>
          <CardDesc>
            Guarde este número. A decisão (procedente ou improcedente) fica registrada
            e o superadmin pode reavaliar depois do prazo.
          </CardDesc>
        </Card>
        <ButtonLink href="/" variant="outline" className="self-start">
          Fazer nova consulta
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container flex max-w-2xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Motorista"
        title="Contestar registro"
        description="Consulte com o seu CPF se há ficha em seu nome e abra contestação. Sem login."
      />

      {erro ? <Alert variant="destructive">{erro}</Alert> : null}
      {aviso ? <Alert variant="success">{aviso}</Alert> : null}

      {!consulta?.existe ? (
        <Card>
          <CardTitle>Consultar por CPF</CardTitle>
          <CardDesc>Só responde se há ficha. Não mostramos quem consultou.</CardDesc>
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void consultar(e)}>
            <Field label="CPF" htmlFor="ct-cpf" hint="11 dígitos" required>
              <input
                id="ct-cpf"
                inputMode="numeric"
                maxLength={14}
                required
                className={controlClass("input")}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={ocupado}>
              {ocupado ? "Consultando…" : "Consultar"}
            </Button>
          </form>
        </Card>
      ) : !escolhido ? (
        <Card className="flex flex-col gap-4">
          <CardTitle>Há ficha no seu CPF</CardTitle>
          <CardDesc>Escolha o incidente contestado e abra o pedido.</CardDesc>
          {consulta.incidentes.length === 0 ? (
            <p className="hint">Nenhum incidente encontrado para este CPF.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {consulta.incidentes.map((i) => (
                <li key={i.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="label">
                        {TIPOS[i.tipo]} · {i.locadora_nome}
                      </p>
                      <p className="hint">
                        {new Date(i.criado_em).toLocaleDateString("pt-BR")} · estado {i.estado}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={i.tem_contestacao_aberta}
                      onClick={() => {
                        setEscolhido(i);
                        setErro(null);
                      }}
                    >
                      {i.tem_contestacao_aberta ? "Já contestado" : "Contestar"}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => {
              setConsulta(null);
              setCpf("");
            }}
          >
            Consultar outro CPF
          </Button>
        </Card>
      ) : (
        <Card>
          <CardTitle>Abrir contestação</CardTitle>
          <CardDesc>
            {TIPOS[escolhido.tipo]} · {escolhido.locadora_nome}. Explique o que aconteceu
            (ao menos 20 caracteres).
          </CardDesc>
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void abrir(e)}>
            <Field label="Seu nome completo" htmlFor="ct-nome" required>
              <input
                id="ct-nome"
                required
                autoComplete="name"
                minLength={5}
                className={controlClass("input")}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </Field>
            <Field label="Seu e-mail" htmlFor="ct-email" required>
              <input
                id="ct-email"
                type="email"
                required
                autoComplete="email"
                className={controlClass("input")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="O que você quer contestar?" htmlFor="ct-desc" required>
              <textarea
                id="ct-desc"
                required
                minLength={20}
                rows={5}
                className={controlClass("textarea")}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={ocupado}>
                {ocupado ? "Enviando…" : "Abrir contestação"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEscolhido(null)}
                disabled={ocupado}
              >
                Voltar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
