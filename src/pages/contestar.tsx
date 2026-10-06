import { useState, type FormEvent } from "react";
import { cpfValido, formatarCpf, somenteDigitos } from "@/lib/dominio";
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

type Consulta = { existe: boolean; contestavel: boolean };

type Abertura =
  | { ok: true; protocolos: string[] }
  | { ok: false; erro: "dados_invalidos" | "nao_encontrado" | "nada_a_contestar" };

const NAO_ENCONTRADO =
  "Não encontramos registro na rede para estes dados. Confira o CPF e a data de nascimento.";

const ERROS_ABERTURA: Record<Exclude<Abertura, { ok: true }>["erro"], string> = {
  dados_invalidos: "Confira os dados: nome completo, e-mail válido e ao menos 20 caracteres na descrição.",
  nao_encontrado: NAO_ENCONTRADO,
  nada_a_contestar: "Não há registro pendente de contestação: ele já está em análise ou já foi decidido.",
};

export default function Contestar() {
  useTitulo("Contestação · Histórico");

  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [protocolos, setProtocolos] = useState<string[] | null>(null);

  function recomecar() {
    setConsulta(null);
    setCpf("");
    setNascimento("");
    setNome("");
    setEmail("");
    setDescricao("");
    setErro(null);
  }

  async function consultar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!cpfValido(cpf)) {
      setErro("CPF inválido. Confira os 11 dígitos.");
      return;
    }
    if (!nascimento) {
      setErro("Informe a sua data de nascimento.");
      return;
    }
    setOcupado(true);
    try {
      const r = await rpc<Consulta>("consultar_ficha_contestacao", {
        p_cpf: somenteDigitos(cpf),
        p_nascimento: nascimento,
      });
      if (r.existe) setConsulta(r);
      else setErro(NAO_ENCONTRADO);
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível consultar agora."));
    } finally {
      setOcupado(false);
    }
  }

  async function abrir(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setOcupado(true);
    try {
      const r = await rpc<Abertura>("abrir_contestacao", {
        p_cpf: somenteDigitos(cpf),
        p_nascimento: nascimento,
        p_nome: nome.trim(),
        p_email: email.trim(),
        p_descricao: descricao.trim(),
      });
      if (r.ok) {
        recomecar();
        setProtocolos(r.protocolos);
      } else {
        setErro(ERROS_ABERTURA[r.erro]);
      }
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível abrir a contestação."));
    } finally {
      setOcupado(false);
    }
  }

  if (protocolos) {
    return (
      <div className="container flex max-w-2xl flex-col gap-6 py-6 sm:py-10">
        <PageHeader
          eyebrow="Contestação"
          title="Pedido aberto"
          description="Cada locadora responsável tem 15 dias úteis para responder. O registro sai da rede enquanto estiver contestado."
        />
        <Card className="flex flex-col gap-3">
          <CardTitle>{protocolos.length > 1 ? "Protocolos" : "Protocolo"}</CardTitle>
          <ul className="flex flex-col gap-1">
            {protocolos.map((p) => (
              <li key={p}>
                <code className="break-all text-sm">{p}</code>
              </li>
            ))}
          </ul>
          <CardDesc>
            Guarde este número. A resposta chega no e-mail informado; a decisão fica
            registrada e o superadmin pode reavaliar depois do prazo.
          </CardDesc>
        </Card>
        <ButtonLink href="/" variant="outline" className="self-start">
          Voltar ao início
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="container flex max-w-2xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Motorista"
        title="Contestar registro"
        description="Confirme sua identidade com CPF e data de nascimento para saber se há registro seu na rede e contestá-lo. Sem login."
      />

      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {!consulta ? (
        <Card>
          <CardTitle>Consultar</CardTitle>
          <CardDesc>
            Só respondemos se há registro, sem detalhes. Por segurança, o número de
            tentativas é limitado.
          </CardDesc>
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void consultar(e)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CPF" htmlFor="ct-cpf" hint="11 dígitos" required>
                <input
                  id="ct-cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                  className={controlClass("input")}
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                />
              </Field>
              <Field label="Data de nascimento" htmlFor="ct-nasc" required>
                <input
                  id="ct-nasc"
                  type="date"
                  required
                  autoComplete="bday"
                  max={new Date().toISOString().slice(0, 10)}
                  className={controlClass("input")}
                  value={nascimento}
                  onChange={(e) => setNascimento(e.target.value)}
                />
              </Field>
            </div>
            <Button type="submit" disabled={ocupado}>
              {ocupado ? "Consultando…" : "Consultar"}
            </Button>
          </form>
        </Card>
      ) : !consulta.contestavel ? (
        <Card className="flex flex-col gap-4">
          <CardTitle>Registro já em análise</CardTitle>
          <CardDesc>
            Há registro em seu nome, mas ele já tem contestação aberta ou decidida.
            Acompanhe pelo e-mail informado no pedido.
          </CardDesc>
          <Button variant="ghost" className="self-start" onClick={recomecar}>
            Nova consulta
          </Button>
        </Card>
      ) : (
        <Card>
          <CardTitle>Há registro em seu nome</CardTitle>
          <CardDesc>
            A contestação vale para todos os seus registros confirmados e tira cada um
            da rede até a decisão. Explique o que aconteceu (ao menos 20 caracteres).
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
            <Field label="Seu e-mail" htmlFor="ct-email" hint="A resposta chega aqui" required>
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
              <Button type="button" variant="ghost" onClick={recomecar} disabled={ocupado}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
