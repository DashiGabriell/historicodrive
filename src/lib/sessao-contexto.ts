import type { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";
import type { Papel } from "./permissao";

export type LocadoraDaConta = {
  id: string;
  nome: string;
  status: "pendente" | "aprovada" | "recusada";
};

export type Perfil = {
  id: string;
  nome: string;
  papel: Papel;
  locadora_ativa: string | null;
  locadoras: LocadoraDaConta[];
};

export type ContextoSessao = {
  carregando: boolean;
  usuario: User | null;
  perfil: Perfil | null;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  esqueciSenha: (email: string) => Promise<void>;
  trocarSenha: (senha: string) => Promise<void>;
  trocarLocadora: (locadoraId: string) => Promise<void>;
  recarregarPerfil: () => Promise<void>;
};

export const CtxSessao = createContext<ContextoSessao | null>(null);

export function useSessao(): ContextoSessao {
  const ctx = useContext(CtxSessao);
  if (!ctx) throw new Error("useSessao precisa estar dentro de <SessaoProvider>");
  return ctx;
}
