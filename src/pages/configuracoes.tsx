import { useState, type FormEvent } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarCnpj, formatarData } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDesc,
  CardTitle,
  Field,
  PageHeader,
  Switch,
  controlClass,
} from "@/ui";

type Locadora = {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  uf: string | null;
  email_contato: string;
  status: "pendente" | "aprovada" | "recusada";
  receber_da_rede: boolean;
  criado_em: string;
  aprovado_em: string | null;
};

export default function Configuracoes() {
  useTitulo("Configurações · Histórico");
  const { perfil } = useSessao();
  const dados = useCarga(`config:${perfil?.locadora_ativa}`, () =>
    rpc<Locadora>("minha_locadora_dados"),
  );

  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Sua locadora"
        title="Configurações"
        description="Dados cadastrais e o que a sua locadora recebe da rede. Toda alteração fica na auditoria."
      />
      {dados.erro ? (
        <ErroCarga mensagem={dados.erro} onTentar={dados.recarregar} />
      ) : !dados.dados ? (
        <CarregandoBloco linhas={5} />
      ) : (
        <Conteudo
          key={dados.dados.id}
          locadora={dados.dados}
          onSalvo={dados.recarregar}
        />
      )}
    </div>
  );
}

function Conteudo({ locadora, onSalvo }: { locadora: Locadora; onSalvo: () => void }) {
  const { recarregarPerfil } = useSessao();
  const [nome, setNome] = useState(locadora.nome);
  const [cidade, setCidade] = useState(locadora.cidade ?? "");
  const [uf, setUf] = useState(locadora.uf ?? "");
  const [email, setEmail] = useState(locadora.email_contato);
  const [rede, setRede] = useState(locadora.receber_da_rede);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [trocandoRede, setTrocandoRede] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    if (nome.trim().length < 3) {
      setErro("O nome precisa de ao menos 3 caracteres.");
      return;
    }
    if (uf && !/^[A-Za-z]{2}$/.test(uf.trim())) {
      setErro("UF inválida: use a sigla com 2 letras.");
      return;
    }

    setSalvando(true);
    try {
      await rpc("atualizar_minha_locadora", {
        p_nome: nome.trim(),
        p_cidade: cidade.trim() || null,
        p_uf: uf.trim().toUpperCase() || null,
        p_email_contato: email.trim(),
      });
      setAviso("Dados salvos.");
      await recarregarPerfil();
      onSalvo();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível salvar."));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarRede(valor: boolean) {
    setErro(null);
    setAviso(null);
    setTrocandoRede(true);
    setRede(valor);
    try {
      await rpc("definir_receber_da_rede", { p_valor: valor });
      setAviso(
        valor
          ? "Agora você recebe os alertas da rede."
          : "Você deixou de receber os alertas da rede.",
      );
    } catch (causa) {
      setRede(!valor);
      setErro(mensagemDe(causa, "Não foi possível alterar."));
    } finally {
      setTrocandoRede(false);
    }
  }

  return (
    <>
      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Receber alertas da rede</CardTitle>
            <CardDesc>
              Ligado, a busca e a ficha mostram incidentes que outras locadoras
              confirmaram com confiança alta. Desligar não tira os seus confirmados da
              rede.
            </CardDesc>
          </div>
          <Switch
            checked={rede}
            disabled={trocandoRede}
            onCheckedChange={(v) => void alternarRede(v)}
            label="Receber alertas da rede"
          />
        </div>
      </Card>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={(e) => void salvar(e)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Dados da locadora</CardTitle>
            <Badge variant={locadora.status === "aprovada" ? "success" : "warning"}>
              {locadora.status === "aprovada"
                ? `Aprovada em ${formatarData(locadora.aprovado_em)}`
                : locadora.status}
            </Badge>
          </div>
          <Field label="Nome" htmlFor="cfg-nome" required>
            <input
              id="cfg-nome"
              required
              className={controlClass("input")}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>
          <Field
            label="CNPJ"
            htmlFor="cfg-cnpj"
            hint="Para alterar o CNPJ, fale com o suporte."
          >
            <input
              id="cfg-cnpj"
              readOnly
              className={controlClass("input")}
              value={formatarCnpj(locadora.cnpj)}
            />
          </Field>
          <div className="grid grid-cols-[1fr_88px] gap-3 sm:grid-cols-[1fr_100px] sm:gap-4">
            <Field label="Cidade" htmlFor="cfg-cidade">
              <input
                id="cfg-cidade"
                autoComplete="address-level2"
                className={controlClass("input")}
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
              />
            </Field>
            <Field label="UF" htmlFor="cfg-uf">
              <input
                id="cfg-uf"
                maxLength={2}
                autoCapitalize="characters"
                autoComplete="address-level1"
                className={controlClass("input")}
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
              />
            </Field>
          </div>
          <Field label="E-mail de contato" htmlFor="cfg-email" required>
            <input
              id="cfg-email"
              type="email"
              required
              className={controlClass("input")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar dados"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
