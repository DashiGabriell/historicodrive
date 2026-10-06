import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cpfValido, formatarCpf, iniciais, somenteDigitos } from "@/lib/dominio";
import { mensagemDe, rpc } from "@/lib/rpc";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Avatar,
  Button,
  ButtonLink,
  Card,
  CardDesc,
  EmptyState,
  Field,
  PageHeader,
  controlClass,
} from "@/ui";

type Resultado = {
  motorista_id: string;
  nome_completo: string;
  foto_caminho: string | null;
  cpf_mascarado: string;
  precisa_confirmar: boolean;
};

type Busca =
  | { tipo: "cpf"; cpf: string; resultados: Resultado[] }
  | { tipo: "nome"; nome: string; resultados: Resultado[] };

export default function BuscaMotorista() {
  useTitulo("Busca no balcão · HistóricoDrive");

  const navegar = useNavigate();
  const [termo, setTermo] = useState("");
  const [busca, setBusca] = useState<Busca | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [escolhido, setEscolhido] = useState<Resultado | null>(null);
  const [cpfConfirma, setCpfConfirma] = useState("");
  const [erroConfirma, setErroConfirma] = useState<string | null>(null);

  function abrirFicha(motoristaId: string, cpf: string) {
    navegar(`/motorista/${motoristaId}`, { state: { cpf } });
  }

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setBusca(null);
    setEscolhido(null);

    const texto = termo.trim();
    const digitos = somenteDigitos(texto);
    const porCpf = digitos.length === 11 && /^[\d.\-\s]+$/.test(texto);

    if (porCpf && !cpfValido(digitos)) {
      setErro("CPF inválido. Confira os 11 dígitos.");
      return;
    }
    if (!porCpf && texto.split(/\s+/).length < 2) {
      setErro("Digite o CPF ou o nome completo exato (nome e sobrenome).");
      return;
    }

    setBuscando(true);
    try {
      const resultados = await rpc<Resultado[]>("buscar_motorista", { p_termo: texto });
      if (porCpf) {
        const unico = resultados[0];
        if (resultados.length === 1 && unico) {
          abrirFicha(unico.motorista_id, digitos);
          return;
        }
        setBusca({ tipo: "cpf", cpf: digitos, resultados });
      } else {
        setBusca({ tipo: "nome", nome: texto, resultados });
      }
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível buscar."));
    } finally {
      setBuscando(false);
    }
  }

  function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) return;
    if (!cpfValido(cpfConfirma)) {
      setErroConfirma("CPF inválido. Confira os 11 dígitos.");
      return;
    }
    abrirFicha(escolhido.motorista_id, somenteDigitos(cpfConfirma));
  }

  return (
    <div className="container flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <PageHeader
        eyebrow="Balcão"
        title="Buscar motorista"
        description="Digite o CPF ou o nome completo exato. A rede é buscável, nunca listável: sem termo, nada aparece."
      />

      <Card>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => void buscar(e)}
        >
          <div className="min-w-[min(260px,100%)] flex-1">
            <Field
              label="CPF ou nome completo"
              htmlFor="termo"
              hint="Ex.: 390.533.447-05 ou Joana Pereira da Silva"
            >
              <input
                id="termo"
                type="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                spellCheck={false}
                enterKeyHint="search"
                autoFocus
                className={controlClass("input")}
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
              />
            </Field>
          </div>
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={buscando || termo.trim().length < 3}
          >
            {buscando ? "Buscando…" : "Buscar"}
          </Button>
        </form>
      </Card>

      {erro ? <Alert variant="destructive">{erro}</Alert> : null}

      {busca && busca.resultados.length === 0 ? (
        <EmptyState
          title="Nenhum registro visível"
          description={
            busca.tipo === "cpf"
              ? "Nem a sua locadora nem a rede têm incidente confirmado para este CPF. Isso não é um atestado de bom histórico."
              : "Nenhum motorista com exatamente este nome tem registro visível para você. Tente pelo CPF."
          }
          action={
            <ButtonLink
              href="/incidente/novo"
              variant="outline"
              size="sm"
              state={busca.tipo === "cpf" ? { cpf: busca.cpf } : { nome: busca.nome }}
            >
              Registrar incidente
            </ButtonLink>
          }
        />
      ) : null}

      {busca && busca.resultados.length > 0 ? (
        <section className="flex flex-col gap-3" aria-label="Resultados">
          {busca.tipo === "nome" ? (
            <Alert variant="info">
              <span>
                <strong>Busca por nome só nomeia.</strong> Escolha a pessoa e confirme o
                CPF para abrir a ficha.
              </span>
            </Alert>
          ) : null}

          <ul className="grid gap-3 sm:grid-cols-2">
            {busca.resultados.map((r) => (
              <li key={r.motorista_id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={iniciais(r.nome_completo)} />
                    <strong>{r.nome_completo}</strong>
                  </div>
                  <Button
                    size="sm"
                    variant={
                      escolhido?.motorista_id === r.motorista_id ? "primary" : "outline"
                    }
                    onClick={() => {
                      if (busca.tipo === "cpf") {
                        abrirFicha(r.motorista_id, busca.cpf);
                        return;
                      }
                      setEscolhido(r);
                      setCpfConfirma("");
                      setErroConfirma(null);
                    }}
                  >
                    {busca.tipo === "cpf" ? "Abrir ficha" : "É esta pessoa"}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {escolhido ? (
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="card-title">Confirmar CPF de {escolhido.nome_completo}</h2>
            <CardDesc>
              Peça o documento no balcão. Sem CPF completo, a ficha não abre.
            </CardDesc>
          </div>
          <form className="flex flex-wrap items-end gap-3" onSubmit={confirmar}>
            <div className="min-w-[min(220px,100%)] flex-1">
              <Field
                label="CPF"
                htmlFor="cpf-confirma"
                error={erroConfirma ?? undefined}
                required
              >
                <input
                  id="cpf-confirma"
                  inputMode="numeric"
                  enterKeyHint="go"
                  autoComplete="off"
                  autoFocus
                  placeholder="000.000.000-00"
                  className={controlClass("input", Boolean(erroConfirma))}
                  value={cpfConfirma}
                  onChange={(e) => setCpfConfirma(formatarCpf(e.target.value))}
                />
              </Field>
            </div>
            <Button type="submit">Abrir ficha</Button>
            <Button variant="ghost" onClick={() => setEscolhido(null)}>
              Cancelar
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
