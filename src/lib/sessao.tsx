import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CtxSessao,
  type ContextoSessao,
  type DadosCadastro,
  type Perfil,
} from "./sessao-contexto";
import { limparRascunhos } from "./rascunho";
import { supabase } from "./supabase";
import { TERMOS_VERSAO } from "./termos";

/** Sessao de 7 dias: o Supabase so permite configurar timebox em plano Pro,
 *  entao o limite fica no cliente. */
const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000;
const CHAVE_INICIO = "hd.sessao.inicio";

function mensagemDeErro(erro: { message: string; code?: string }): string {
  if (
    erro.code === "invalid_credentials" ||
    /invalid login credentials/i.test(erro.message)
  ) {
    return "E-mail ou senha incorretos.";
  }
  if (/password.*at least|at least \d+ characters/i.test(erro.message)) {
    return "A senha precisa de ao menos 8 caracteres.";
  }
  if (/rate limit|too many/i.test(erro.message)) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  if (/user not found/i.test(erro.message)) {
    return "E-mail não encontrado.";
  }
  if (/already registered|user_already_exists/i.test(erro.message)) {
    return "Este e-mail já tem conta. Entre com ele ou recupere a senha.";
  }
  return erro.message;
}

/** varios eventos de auth chegam juntos; cada pedido gera uma locadora,
 *  entao ele so pode sair uma vez por usuario */
const pedidosDeCadastro = new Map<string, Promise<boolean>>();

/** conta recem-criada sem perfil: envia o pedido guardado no user_metadata */
async function concluirCadastroPendente(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const conta = data.session?.user;
  const pedido = conta?.user_metadata?.cadastro as DadosCadastro | undefined;
  if (!conta || !pedido) return false;

  let envio = pedidosDeCadastro.get(conta.id);
  if (!envio) {
    envio = Promise.resolve(
      supabase.rpc("solicitar_cadastro", {
        p_nome_locadora: pedido.nome_locadora,
        p_cnpj: pedido.cnpj,
        p_cidade: pedido.cidade,
        p_uf: pedido.uf,
        p_email_contato: pedido.email_contato,
        p_nome_dono: pedido.nome_dono,
        p_aceitou_termos: pedido.aceitou_termos === true,
        p_termos_versao: TERMOS_VERSAO,
      }),
    ).then(({ error }) => {
      if (error) pedidosDeCadastro.delete(conta.id);
      return !error;
    });
    pedidosDeCadastro.set(conta.id, envio);
  }
  return envio;
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregarPerfil = useCallback(async () => {
    let { data, error } = await supabase.rpc("meu_perfil");
    if ((error || !data) && (await concluirCadastroPendente())) {
      ({ data, error } = await supabase.rpc("meu_perfil"));
    }
    const bruto = (error ? null : data) as Partial<Perfil> | null;

    // conta sem linha de perfil: cai para a tela de cadastro pendente
    if (!bruto?.id || !bruto.papel) {
      setPerfil(null);
      return;
    }

    setPerfil({
      id: bruto.id,
      nome: bruto.nome ?? "",
      papel: bruto.papel,
      locadora_ativa: bruto.locadora_ativa ?? null,
      locadoras: bruto.locadoras ?? [],
    });
  }, []);

  useEffect(() => {
    let ativo = true;

    function sessaoExpirada(): boolean {
      const inicio = Number(localStorage.getItem(CHAVE_INICIO) ?? 0);
      return inicio > 0 && Date.now() - inicio > DURACAO_SESSAO_MS;
    }

    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;

      if (data.session && sessaoExpirada()) {
        await supabase.auth.signOut();
        localStorage.removeItem(CHAVE_INICIO);
        limparRascunhos();
        setCarregando(false);
        return;
      }

      setUsuario(data.session?.user ?? null);
      if (data.session) await recarregarPerfil();
      if (ativo) setCarregando(false);
    }

    void iniciar();

    const { data: inscricao } = supabase.auth.onAuthStateChange(
      async (evento, sessao) => {
        if (!ativo) return;

        setUsuario(sessao?.user ?? null);

        if (evento === "SIGNED_IN" && !localStorage.getItem(CHAVE_INICIO)) {
          localStorage.setItem(CHAVE_INICIO, String(Date.now()));
        }

        if (evento === "SIGNED_OUT") {
          localStorage.removeItem(CHAVE_INICIO);
          limparRascunhos();
          setPerfil(null);
          return;
        }

        if (sessao) await recarregarPerfil();
      },
    );

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, [recarregarPerfil]);

  const entrar = useCallback(
    async (email: string, senha: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw new Error(mensagemDeErro(error));
      localStorage.setItem(CHAVE_INICIO, String(Date.now()));
      await recarregarPerfil();
    },
    [recarregarPerfil],
  );

  const cadastrar = useCallback(
    async (email: string, senha: string, dados: DadosCadastro) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          data: { cadastro: dados },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw new Error(mensagemDeErro(error));
      if (!data.session) return false;

      localStorage.setItem(CHAVE_INICIO, String(Date.now()));
      await recarregarPerfil();
      return true;
    },
    [recarregarPerfil],
  );

  const sair = useCallback(async () => {
    limparRascunhos();
    await supabase.auth.signOut();
  }, []);

  const esqueciSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir`,
    });
    if (error) throw new Error(mensagemDeErro(error));
  }, []);

  const trocarSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) throw new Error(mensagemDeErro(error));
  }, []);

  const trocarLocadora = useCallback(
    async (locadoraId: string) => {
      const { error } = await supabase.rpc("definir_locadora_ativa", {
        p_locadora_id: locadoraId,
      });
      if (error) throw new Error(error.message);
      await recarregarPerfil();
    },
    [recarregarPerfil],
  );

  const valor = useMemo<ContextoSessao>(
    () => ({
      carregando,
      usuario,
      perfil,
      entrar,
      cadastrar,
      sair,
      esqueciSenha,
      trocarSenha,
      trocarLocadora,
      recarregarPerfil,
    }),
    [
      carregando,
      usuario,
      perfil,
      entrar,
      cadastrar,
      sair,
      esqueciSenha,
      trocarSenha,
      trocarLocadora,
      recarregarPerfil,
    ],
  );

  return <CtxSessao.Provider value={valor}>{children}</CtxSessao.Provider>;
}
