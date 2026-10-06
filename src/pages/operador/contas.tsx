import { useState } from "react";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { formatarDataHora } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  type Column,
} from "@/ui";

type PapelConta = "superadmin" | "dono";

type Conta = {
  id: string;
  nome: string;
  papel: PapelConta;
  email: string | null;
  criado_em: string;
  locadoras: Array<{ id: string; nome: string; status: string }>;
};

const PAPEL: Record<PapelConta, string> = {
  superadmin: "Superadmin",
  dono: "Dono",
};

export default function OperadorContas() {
  useTitulo("Contas · Operação · Histórico");
  const { perfil } = useSessao();
  const lista = useCarga("operador-contas", () =>
    rpc<Conta[]>("operador_listar_contas"),
  );
  const [alvo, setAlvo] = useState<Conta | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const proximo = alvo?.papel === "superadmin" ? "dono" : "superadmin";

  async function confirmar() {
    if (!alvo) return;
    setErro(null);
    setAviso(null);
    setOcupado(true);
    try {
      await rpc("operador_definir_papel", {
        p_perfil_id: alvo.id,
        p_papel: proximo,
      });
      setAviso(`${alvo.nome} agora é ${PAPEL[proximo].toLowerCase()}.`);
      setAlvo(null);
      lista.recarregar();
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível alterar o papel."));
    } finally {
      setOcupado(false);
    }
  }

  const colunas: Array<Column<Conta>> = [
    {
      key: "nome",
      header: "Conta",
      render: (c) => (
        <div className="min-w-0">
          <p className="font-semibold">
            {c.nome}
            {c.id === perfil?.id ? <span className="hint"> · você</span> : null}
          </p>
          <p className="hint">{c.email ?? "sem e-mail"}</p>
        </div>
      ),
    },
    {
      key: "papel",
      header: "Papel",
      render: (c) => (
        <Badge variant={c.papel === "superadmin" ? "primary" : "secondary"}>
          {PAPEL[c.papel]}
        </Badge>
      ),
    },
    {
      key: "locadoras",
      header: "Locadoras",
      render: (c) =>
        c.locadoras.length === 0 ? "—" : c.locadoras.map((l) => l.nome).join(", "),
    },
    {
      key: "quando",
      header: "Desde",
      render: (c) => (
        <span className="whitespace-nowrap">{formatarDataHora(c.criado_em)}</span>
      ),
    },
    {
      key: "acao",
      header: "Ação",
      align: "right",
      render: (c) =>
        c.id === perfil?.id ? (
          <span className="hint">sua conta</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAlvo(c);
              setErro(null);
            }}
          >
            {c.papel === "superadmin" ? "Tornar dono" : "Tornar superadmin"}
          </Button>
        ),
    },
  ];

  return (
    <div className="container flex flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Contas"
        description="Donos operam a locadora. Superadmin opera a plataforma e não abre ficha. A própria conta não muda de papel por aqui."
      />

      {aviso ? <Alert variant="success">{aviso}</Alert> : null}
      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {alvo ? (
        <Card className="flex flex-col gap-3">
          <p>
            <strong>{alvo.nome}</strong> passa de {PAPEL[alvo.papel].toLowerCase()} para{" "}
            {PAPEL[proximo].toLowerCase()}.
          </p>
          <p className="hint">
            {proximo === "superadmin"
              ? "Esta conta deixa as telas da locadora e entra no console de operação."
              : "Esta conta deixa o console e volta a depender de uma locadora ativa."}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlvo(null)}
              disabled={ocupado}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void confirmar()} disabled={ocupado}>
              {ocupado ? "Salvando…" : "Confirmar"}
            </Button>
          </div>
        </Card>
      ) : null}

      {lista.erro ? (
        <ErroCarga mensagem={lista.erro} onTentar={lista.recarregar} />
      ) : !lista.dados ? (
        <CarregandoBloco linhas={4} />
      ) : (
        <DataTable
          columns={colunas}
          rows={lista.dados}
          rowKey={(c) => c.id}
          caption="Contas da plataforma"
          empty={
            <EmptyState
              title="Nenhuma conta"
              description="Ainda não há perfil cadastrado."
            />
          }
        />
      )}
    </div>
  );
}
