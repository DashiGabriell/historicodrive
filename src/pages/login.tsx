import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
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

export default function Login() {
  useTitulo("Entrar · HistóricoDrive");

  const { carregando, usuario, perfil, entrar, sair } = useSessao();
  const local = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = (local.state as { de?: string } | null)?.de;

  if (carregando) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <p className="label">Carregando sessão…</p>
      </div>
    );
  }

  if (perfil) {
    return <Navigate to={destino ?? rotaInicial(perfil.papel)} replace />;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha precisa de ao menos 8 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  if (usuario) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
        <Card className="w-full max-w-md">
          <CardTitle>Cadastro pendente</CardTitle>
          <CardDesc>
            O e-mail {usuario.email} já tem conta, mas ainda não está ligado a uma
            locadora aprovada. Peça ao superadmin para liberar o acesso.
          </CardDesc>
          <Button variant="outline" onClick={() => void sair()}>
            Entrar com outra conta
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card>
          <CardTitle>Entrar no HistóricoDrive</CardTitle>
          <CardDesc>Use o e-mail e a senha cadastrados na sua locadora.</CardDesc>

          <form className="flex flex-col gap-4" onSubmit={(e) => void enviar(e)}>
            <Field label="E-mail" htmlFor="email" required>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className={controlClass("input")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Senha" htmlFor="senha" hint="Mínimo de 8 caracteres" required>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                required
                className={controlClass("input")}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </Field>

            {erro ? <Alert variant="destructive">{erro}</Alert> : null}

            <Button type="submit" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </Card>

        <div className="flex items-center justify-between text-sm">
          <Link
            to="/esqueci-senha"
            className="text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
          <ButtonLink href="/cadastro" variant="ghost" size="sm">
            Cadastrar minha locadora
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
