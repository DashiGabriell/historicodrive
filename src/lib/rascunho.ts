/**
 * Rascunho do incidente guarda CPF, nome e descrição do motorista: fica em
 * sessionStorage (morre com a aba) e é apagado no logout — computador de
 * balcão é compartilhado.
 */
const PREFIXO = "hd.rascunho.";

export const chaveRascunho = (locadoraId: string) => `${PREFIXO}${locadoraId}`;

export type RascunhoSalvo = {
  id: string;
  atualizadoEm: string;
  dados: Record<string, unknown>;
};

type Guardado = { versao: 2; itens: RascunhoSalvo[] };

function eObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function eItem(valor: unknown): valor is RascunhoSalvo {
  return (
    eObjeto(valor) &&
    typeof valor.id === "string" &&
    typeof valor.atualizadoEm === "string" &&
    eObjeto(valor.dados)
  );
}

export function novoIdRascunho(): string {
  return crypto.randomUUID();
}

function ler(locadoraId: string): RascunhoSalvo[] {
  localStorage.removeItem(chaveRascunho(locadoraId));
  let bruto: unknown;
  try {
    bruto = JSON.parse(sessionStorage.getItem(chaveRascunho(locadoraId)) ?? "null");
  } catch {
    return [];
  }
  if (!eObjeto(bruto)) return [];
  if (bruto.versao === 2 && Array.isArray(bruto.itens)) return bruto.itens.filter(eItem);
  // formato antigo: um rascunho solto por locadora; converte uma vez só
  if (Object.keys(bruto).length === 0) return [];
  const itens = [{ id: novoIdRascunho(), atualizadoEm: new Date().toISOString(), dados: bruto }];
  gravar(locadoraId, itens);
  return itens;
}

function gravar(locadoraId: string, itens: RascunhoSalvo[]): void {
  try {
    if (itens.length === 0) {
      sessionStorage.removeItem(chaveRascunho(locadoraId));
      return;
    }
    const guardado: Guardado = { versao: 2, itens };
    sessionStorage.setItem(chaveRascunho(locadoraId), JSON.stringify(guardado));
  } catch {
    // cota cheia ou storage bloqueado: o rascunho é conveniência, não prova
  }
}

/** mais recente primeiro */
export function listarRascunhos(locadoraId: string): RascunhoSalvo[] {
  return [...ler(locadoraId)].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

export function lerRascunho(locadoraId: string, id: string): Record<string, unknown> | null {
  return ler(locadoraId).find((item) => item.id === id)?.dados ?? null;
}

export function salvarRascunho(
  locadoraId: string,
  id: string,
  dados: Record<string, unknown>,
): void {
  const outros = ler(locadoraId).filter((item) => item.id !== id);
  gravar(locadoraId, [...outros, { id, atualizadoEm: new Date().toISOString(), dados }]);
}

export function apagarRascunho(locadoraId: string, id: string): void {
  gravar(
    locadoraId,
    ler(locadoraId).filter((item) => item.id !== id),
  );
}

export function limparRascunhos(): void {
  for (const storage of [sessionStorage, localStorage]) {
    const chaves: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const chave = storage.key(i);
      if (chave?.startsWith(PREFIXO)) chaves.push(chave);
    }
    chaves.forEach((chave) => storage.removeItem(chave));
  }
}
