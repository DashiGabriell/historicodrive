/**
 * Rascunho do incidente guarda CPF, nome e descrição do motorista: fica em
 * sessionStorage (morre com a aba) e é apagado no logout — computador de
 * balcão é compartilhado.
 */
const PREFIXO = "hd.rascunho.";

export const chaveRascunho = (locadoraId: string) => `${PREFIXO}${locadoraId}`;

export function lerRascunho(locadoraId: string): unknown {
  localStorage.removeItem(chaveRascunho(locadoraId));
  try {
    return JSON.parse(sessionStorage.getItem(chaveRascunho(locadoraId)) ?? "{}");
  } catch {
    return {};
  }
}

export function salvarRascunho(locadoraId: string, valor: unknown): void {
  try {
    sessionStorage.setItem(chaveRascunho(locadoraId), JSON.stringify(valor));
  } catch {
    // cota cheia ou storage bloqueado: o rascunho é conveniência, não prova
  }
}

export function apagarRascunho(locadoraId: string): void {
  sessionStorage.removeItem(chaveRascunho(locadoraId));
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
