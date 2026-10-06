import { useState, type FormEvent } from "react";
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

export default function EsqueciSenha() {
  useTitulo("Recuperar senha · Histórico");

  const { esqueciSenha } = useSessao();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await esqueciSenha(email);
      setEnviado(true);
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa.message : "Não foi possível enviar o link.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardTitle>Esqueci minha senha</CardTitle>
          <CardDesc>
            Informe o e-mail da conta. Se ele existir, enviamos um link para criar uma
            senha nova.
          </CardDesc>

          {enviado ? (
            <Alert variant="success">
              <strong>Link enviado.</strong> Confira a caixa de entrada de {email}. O
              link vale por pouco tempo.
            </Alert>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={(e) => void enviar(e)}>
              <Field label="E-mail" htmlFor="email-recuperacao" required>
                <input
                  id="email-recuperacao"
                  type="email"
                  autoComplete="email"
                  required
                  className={controlClass("input")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {erro ? <Alert variant="destructive">{erro}</Alert> : null}

              <Button type="submit" disabled={enviando}>
                {enviando ? "Enviando…" : "Enviar link"}
              </Button>
            </form>
          )}
        </Card>

        <div className="flex justify-between text-sm">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Voltar para o login
          </ButtonLink>
          <ButtonLink href="/" variant="ghost" size="sm">
            Início
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
