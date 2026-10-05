import { useState, type FormEvent } from "react";
import { rotaInicial } from "@/lib/permissao";
import { useSessao } from "@/lib/sessao-contexto";
import { useTitulo } from "@/lib/use-titulo";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardDesc,
  CardTitle,
  Field,
  controlClass,
} from "@/ui";

export default function RedefinirSenha() {
  useTitulo("Criar senha nova · HistóricoDrive");

  const { carregando, usuario, perfil, trocarSenha } = useSessao();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha precisa de ao menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setEnviando(true);
    try {
      await trocarSenha(senha);
      setFeito(true);
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa.message : "Não foi possível salvar a senha.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <p className="label">Validando o link…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardTitle>Criar senha nova</CardTitle>
          <CardDesc>Escolha uma senha de ao menos 8 caracteres.</CardDesc>

          {!usuario ? (
            <Alert variant="destructive">
              <strong>Link inválido ou expirado.</strong> Peça um novo link de
              recuperação.
            </Alert>
          ) : feito ? (
            <Alert variant="success">
              <strong>Senha atualizada.</strong> Já pode entrar com a senha nova.
            </Alert>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={(e) => void enviar(e)}>
              <Field
                label="Nova senha"
                htmlFor="senha-nova"
                hint="Mínimo de 8 caracteres"
                required
              >
                <input
                  id="senha-nova"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={controlClass("input")}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </Field>

              <Field label="Repetir a nova senha" htmlFor="senha-repete" required>
                <input
                  id="senha-repete"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={controlClass("input")}
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                />
              </Field>

              {erro ? <Alert variant="destructive">{erro}</Alert> : null}

              <Button type="submit" disabled={enviando}>
                {enviando ? "Salvando…" : "Salvar senha"}
              </Button>
            </form>
          )}
        </Card>

        {!usuario ? (
          <ButtonLink href="/esqueci-senha" variant="outline" size="sm">
            Pedir um novo link
          </ButtonLink>
        ) : (
          <ButtonLink
            href={feito && perfil ? rotaInicial(perfil.papel) : "/login"}
            variant="outline"
            size="sm"
          >
            Ir para o login
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
