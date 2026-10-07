import { useEffect, useSyncExternalStore } from "react";
import { rpc } from "./rpc";

export type Alerta = {
  id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  incidente_id: string | null;
  lida: boolean;
  criado_em: string;
};

export type TipoComunicado = "novidade" | "manutencao" | "importante";

export type Comunicado = {
  id: string;
  tipo: TipoComunicado;
  titulo: string;
  corpo: string;
  link: string | null;
  lido: boolean;
  criado_em: string;
};

export type ComunicadoAdmin = Omit<Comunicado, "lido"> & {
  retirado_em: string | null;
  leituras: number;
};

export const TIPOS_COMUNICADO: Record<TipoComunicado, string> = {
  novidade: "Novidade",
  manutencao: "Manutenção",
  importante: "Importante",
};

export const TITULO_MAX = 120;
export const CORPO_MAX = 2000;

/** espelha o check da tabela comunicado: caminho interno ou https */
export function linkValido(link: string): boolean {
  if (link === "") return true;
  if (link.length > 500) return false;
  return /^\/(?!\/)/.test(link) || /^https:\/\/\S+$/.test(link);
}

export function linkInterno(link: string): boolean {
  return /^\/(?!\/)/.test(link);
}

export function erroDoComunicado(c: { titulo: string; corpo: string; link: string }): string | null {
  const titulo = c.titulo.trim().length;
  if (titulo < 3 || titulo > TITULO_MAX) return `O título precisa de 3 a ${TITULO_MAX} caracteres.`;
  const corpo = c.corpo.trim().length;
  if (corpo < 1 || corpo > CORPO_MAX) return `O texto precisa de 1 a ${CORPO_MAX} caracteres.`;
  if (!linkValido(c.link.trim())) {
    return "Link inválido: use um caminho do app (como /rascunhos) ou um endereço https://.";
  }
  return null;
}

// ---------- contador do sino ----------

type Contagem = { alertas: number; novidades: number };

const ATUALIZAR_A_CADA_MS = 60_000;
let contagem: Contagem = { alertas: 0, novidades: 0 };
const ouvintes = new Set<() => void>();

function definir(nova: Contagem) {
  if (nova.alertas === contagem.alertas && nova.novidades === contagem.novidades) return;
  contagem = nova;
  ouvintes.forEach((avisar) => avisar());
}

/** chame depois de marcar algo como lido para o sino acompanhar */
export async function atualizarNaoLidas(): Promise<void> {
  try {
    const r = await rpc<Contagem>("contar_nao_lidas");
    definir({ alertas: Number(r?.alertas) || 0, novidades: Number(r?.novidades) || 0 });
  } catch {
    // o sino é atalho: sem rede, fica com a última contagem
  }
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

/** total de não lidas da locadora ativa; `chave` null desliga (sem sessão de dono) */
export function useNaoLidas(chave: string | null): Contagem {
  const atual = useSyncExternalStore(
    assinar,
    () => contagem,
    () => contagem,
  );

  useEffect(() => {
    if (chave === null) return;
    void atualizarNaoLidas();
    const intervalo = window.setInterval(() => void atualizarNaoLidas(), ATUALIZAR_A_CADA_MS);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void atualizarNaoLidas();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      definir({ alertas: 0, novidades: 0 });
    };
  }, [chave]);

  return chave === null ? { alertas: 0, novidades: 0 } : atual;
}
