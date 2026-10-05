import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CtxSessao, type ContextoSessao, type Perfil } from "./sessao-contexto";
import { supabase } from "./supabase";

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
  return erro.message;
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregarPerfil = useCallback(async () => {
    const { data, error } = await supabase.rpc("meu_perfil");
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

  const sair = useCallback(async () => {
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
      sair,
      esqueciSenha,
      trocarSenha,
      trocarLocadora,
      recarregarPerfil,
    ],
  );

  return <CtxSessao.Provider value={valor}>{children}</CtxSessao.Provider>;
}
