import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  CarregandoBloco,
  ConfiancaBadge,
  EstadoBadge,
  ErroCarga,
} from "@/components/dominio";
import {
  TIPOS,
  cpfValido,
  formatarCpf,
  formatarData,
  formatarMoeda,
  somenteDigitos,
  type Confianca,
  type Estado,
  type TipoIncidente,
} from "@/lib/dominio";
import { rpc } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { useCarga } from "@/lib/use-carga";
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
  Field,
  PageHeader,
  Tabs,
  controlClass,
} from "@/ui";

type IncidenteFicha = {
  id: string;
  proprio: boolean;
  locadora_nome: string;
  placa: string;
  tipo: TipoIncidente;
  valor: number | null;
  descricao: string;
  estado: Estado;
  confianca: Confianca;
  motivo: string | null;
  criado_em: string;
  criado_por_nome: string | null;
};

type Ficha = {
  motorista: {
    id: string;
    nome_completo: string;
    cpf_mascarado: string;
    nascimento: string | null;
    criado_em: string;
  };
  incidentes: IncidenteFicha[];
};

const PEDE_CPF = /confirme o CPF/i;

export default function Motorista() {
  const { id = "" } = useParams();
  const local = useLocation();
  const { perfil } = useSessao();
  const [cpf, setCpf] = useState(
    () => (local.state as { cpf?: string } | null)?.cpf ?? "",
  );
  const [cpfDigitado, setCpfDigitado] = useState("");
  const [erroCpf, setErroCpf] = useState<string | null>(null);
  const [aba, setAba] = useState("todos");

  const ficha = useCarga(`ficha:${perfil?.locadora_ativa}:${id}:${cpf}`, () =>
    rpc<Ficha>("abrir_ficha", { p_motorista_id: id, p_cpf_confirmado: cpf || null }),
  );

  useTitulo(
    ficha.dados
      ? `${ficha.dados.motorista.nome_completo} · HistóricoDrive`
      : "Ficha do motorista · HistóricoDrive",
  );

  function confirmarCpf(evento: FormEvent) {
    evento.preventDefault();
    if (!cpfValido(cpfDigitado)) {
      setErroCpf("CPF inválido. Confira os 11 dígitos.");
      return;
    }
    setErroCpf(null);
    setCpf(somenteDigitos(cpfDigitado));
  }

  if (ficha.erro && PEDE_CPF.test(ficha.erro)) {
    return (
      <div className="container flex flex-1 flex-col items-center py-16">
        <Card className="flex w-full max-w-md flex-col gap-4">
          <div>
            <CardTitle>Confirme o CPF</CardTitle>
            <CardDesc>
              Este motorista ainda não tem registro da sua locadora. Para abrir a ficha
              com dados da rede, informe o CPF completo do documento.
            </CardDesc>
          </div>
          <form className="flex flex-col gap-4" onSubmit={confirmarCpf}>
            <Field
              label="CPF"
              htmlFor="cpf-ficha"
              error={erroCpf ?? undefined}
              required
            >
              <input
                id="cpf-ficha"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                placeholder="000.000.000-00"
                className={controlClass("input", Boolean(erroCpf))}
                value={cpfDigitado}
                onChange={(e) => setCpfDigitado(formatarCpf(e.target.value))}
              />
            </Field>
            {cpf ? (
              <Alert variant="destructive">
                O CPF informado não confere com esta ficha.
              </Alert>
            ) : null}
            <div className="flex justify-between gap-2">
              <ButtonLink href="/busca" variant="ghost">
                Voltar à busca
              </ButtonLink>
              <Button type="submit">Abrir ficha</Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  if (ficha.erro) {
    return (
      <div className="container flex flex-col gap-4 py-16">
        <ErroCarga mensagem={ficha.erro} onTentar={ficha.recarregar} />
        <ButtonLink href="/busca" variant="outline" className="self-start">
          Voltar à busca
        </ButtonLink>
      </div>
    );
  }

  if (!ficha.dados) {
    return (
      <div className="container flex flex-col gap-4 py-6 sm:py-10">
        <CarregandoBloco linhas={2} />
        <CarregandoBloco />
      </div>
    );
  }

  const { motorista, incidentes } = ficha.dados;
  const proprios = incidentes.filter((i) => i.proprio);
  const daRede = incidentes.filter((i) => !i.proprio);
  const visiveis = aba === "proprios" ? proprios : aba === "rede" ? daRede : incidentes;

  return (
    <div className="container flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <PageHeader
        eyebrow="Ficha do motorista"
        title={motorista.nome_completo}
        description={
          <>
            CPF {motorista.cpf_mascarado}
            {motorista.nascimento
              ? ` · nascido em ${formatarData(motorista.nascimento)}`
              : ""}
          </>
        }
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <ButtonLink href="/busca" variant="outline">
              Nova busca
            </ButtonLink>
            <ButtonLink
              href="/incidente/novo"
              state={{ motorista: { id: motorista.id, nome: motorista.nome_completo } }}
            >
              Registrar
            </ButtonLink>
          </div>
        }
      />

      {daRede.length > 0 ? (
        <Alert variant="destructive">
          <span>
            <strong>Alerta da rede.</strong> Outra locadora confirmou, com confiança
            alta, incidente com este motorista. Anexos de outras locadoras nunca são
            exibidos.
          </span>
        </Alert>
      ) : null}

      <Tabs
        label="Filtrar incidentes"
        value={aba}
        onValueChange={setAba}
        tabs={[
          { id: "todos", label: `Todos (${incidentes.length})` },
          { id: "proprios", label: `Sua locadora (${proprios.length})` },
          { id: "rede", label: `Rede (${daRede.length})` },
        ]}
      />

      {visiveis.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description="Nenhum incidente visível neste filtro."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visiveis.map((i) => (
            <li key={i.id}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{TIPOS[i.tipo]}</CardTitle>
                    <CardDesc>
                      {formatarData(i.criado_em)} · placa {i.placa} ·{" "}
                      {i.proprio ? "registrado pela sua locadora" : i.locadora_nome}
                    </CardDesc>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {i.proprio ? <Badge variant="primary">Sua locadora</Badge> : null}
                    <EstadoBadge estado={i.estado} />
                    <ConfiancaBadge confianca={i.confianca} />
                  </div>
                </div>
                <p>{i.descricao}</p>
                {i.motivo ? (
                  <p className="hint">
                    <strong>Motivo da última mudança:</strong> {i.motivo}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="label">Prejuízo: {formatarMoeda(i.valor)}</span>
                  {i.proprio ? (
                    <Link
                      to={`/incidente/${i.id}`}
                      className="text-sm font-semibold text-primary"
                    >
                      Abrir detalhe →
                    </Link>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
