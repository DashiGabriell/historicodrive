import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { rotaInicial } from "@/lib/permissao";
import { somenteDigitos } from "@/lib/dominio";
import { mensagemDe } from "@/lib/rpc";
import { useSessao } from "@/lib/sessao-contexto";
import { TERMOS_VERSAO } from "@/lib/termos";
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

export default function Cadastro() {
  useTitulo("Cadastrar locadora · Histórico");

  const { carregando, perfil, cadastrar } = useSessao();
  const [form, setForm] = useState({
    nomeLocadora: "",
    cnpj: "",
    cidade: "",
    uf: "",
    emailContato: "",
    nomeDono: "",
    email: "",
    senha: "",
    aceitouTermos: false,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [aguardandoEmail, setAguardandoEmail] = useState(false);

  if (!carregando && perfil) {
    return <Navigate to={rotaInicial(perfil.papel)} replace />;
  }

  function campo(nome: Exclude<keyof typeof form, "aceitouTermos">) {
    return {
      value: form[nome],
      onChange: (e: { target: { value: string } }) =>
        setForm((f) => ({ ...f, [nome]: e.target.value })),
    };
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);

    const cnpj = somenteDigitos(form.cnpj);
    if (form.nomeLocadora.trim().length < 3)
      return setErro("Informe o nome da locadora.");
    if (cnpj && cnpj.length !== 14) return setErro("CNPJ inválido: use os 14 dígitos.");
    if (form.uf && !/^[A-Za-z]{2}$/.test(form.uf.trim())) {
      return setErro("UF inválida: use a sigla com 2 letras.");
    }
    if (form.nomeDono.trim().length < 3) return setErro("Informe o seu nome.");
    if (form.senha.length < 8)
      return setErro("A senha precisa de ao menos 8 caracteres.");
    if (!form.aceitouTermos)
      return setErro("Aceite os Termos de uso para pedir acesso.");

    setEnviando(true);
    try {
      const comSessao = await cadastrar(form.email, form.senha, {
        nome_locadora: form.nomeLocadora.trim(),
        cnpj: cnpj || null,
        cidade: form.cidade.trim() || null,
        uf: form.uf.trim().toUpperCase() || null,
        email_contato: (form.emailContato || form.email).trim(),
        nome_dono: form.nomeDono.trim(),
        aceitou_termos: form.aceitouTermos,
      });
      if (!comSessao) setAguardandoEmail(true);
    } catch (causa) {
      setErro(mensagemDe(causa, "Não foi possível enviar o cadastro."));
    } finally {
      setEnviando(false);
    }
  }

  if (aguardandoEmail) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
        <Card className="w-full max-w-md">
          <CardTitle>Confirme o seu e-mail</CardTitle>
          <CardDesc>
            Enviamos um link para {form.email}. Depois de confirmar e entrar, o pedido
            da {form.nomeLocadora} segue para aprovação.
          </CardDesc>
          <ButtonLink href="/login" className="mt-4">
            Ir para o login
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-8 sm:px-6 sm:py-16">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <Card>
          <CardTitle>Sou locadora</CardTitle>
          <CardDesc>
            Peça acesso à rede. O cadastro fica pendente até o superadmin aprovar.
          </CardDesc>

          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void enviar(e)}>
            <fieldset className="flex flex-col gap-4">
              <legend className="eyebrow mb-2">Locadora</legend>
              <Field label="Nome da locadora" htmlFor="cad-nome" required>
                <input
                  id="cad-nome"
                  required
                  className={controlClass("input")}
                  {...campo("nomeLocadora")}
                />
              </Field>
              <Field label="CNPJ" htmlFor="cad-cnpj" hint="Só números; opcional">
                <input
                  id="cad-cnpj"
                  inputMode="numeric"
                  className={controlClass("input")}
                  {...campo("cnpj")}
                />
              </Field>
              <div className="grid grid-cols-[1fr_88px] gap-3 sm:grid-cols-[1fr_100px] sm:gap-4">
                <Field label="Cidade" htmlFor="cad-cidade">
                  <input
                    id="cad-cidade"
                    autoComplete="address-level2"
                    className={controlClass("input")}
                    {...campo("cidade")}
                  />
                </Field>
                <Field label="UF" htmlFor="cad-uf">
                  <input
                    id="cad-uf"
                    maxLength={2}
                    autoCapitalize="characters"
                    autoComplete="address-level1"
                    className={controlClass("input")}
                    {...campo("uf")}
                  />
                </Field>
              </div>
              <Field
                label="E-mail de contato da locadora"
                htmlFor="cad-contato"
                hint="Se vazio, usamos o seu e-mail de acesso"
              >
                <input
                  id="cad-contato"
                  type="email"
                  className={controlClass("input")}
                  {...campo("emailContato")}
                />
              </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-4">
              <legend className="eyebrow mb-2">Seu acesso</legend>
              <Field label="Seu nome" htmlFor="cad-dono" required>
                <input
                  id="cad-dono"
                  required
                  autoComplete="name"
                  className={controlClass("input")}
                  {...campo("nomeDono")}
                />
              </Field>
              <Field label="E-mail de acesso" htmlFor="cad-email" required>
                <input
                  id="cad-email"
                  type="email"
                  required
                  autoComplete="email"
                  className={controlClass("input")}
                  {...campo("email")}
                />
              </Field>
              <Field
                label="Senha"
                htmlFor="cad-senha"
                hint="Mínimo de 8 caracteres"
                required
              >
                <input
                  id="cad-senha"
                  type="password"
                  required
                  autoComplete="new-password"
                  className={controlClass("input")}
                  {...campo("senha")}
                />
              </Field>
            </fieldset>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.aceitouTermos}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aceitouTermos: e.target.checked }))
                }
              />
              <span>
                Li e aceito os{" "}
                <Link to="/termos" className="text-primary underline">
                  Termos de uso (v{TERMOS_VERSAO})
                </Link>
                .
              </span>
            </label>

            {erro ? <Alert variant="destructive">{erro}</Alert> : null}

            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Pedir acesso"}
            </Button>
          </form>
        </Card>

        <div className="flex items-center justify-between text-sm">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Já tenho conta
          </ButtonLink>
          <ButtonLink href="/" variant="ghost" size="sm">
            Voltar
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
