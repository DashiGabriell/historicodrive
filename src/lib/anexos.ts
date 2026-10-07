import { supabase } from "./supabase";

const BUCKET = "anexos";
const VALIDADE_URL_S = 60 * 60;

/** image/* (e não a lista exata) faz o iOS converter HEIC da galeria em JPEG */
export const TIPOS_ACEITOS = "image/*,application/pdf";
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;

/** espelha allowed_mime_types do bucket "anexos" */
const TIPOS_POR_EXTENSAO: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};
const TIPOS_DO_BUCKET = new Set(Object.values(TIPOS_POR_EXTENSAO));

/** o app Arquivos do iOS às vezes entrega o arquivo sem type: deduz pela extensão */
export function tipoDoArquivo(arquivo: Pick<File, "name" | "type">): string | null {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";
  const tipo = arquivo.type || TIPOS_POR_EXTENSAO[extensao] || "";
  return TIPOS_DO_BUCKET.has(tipo) ? tipo : null;
}

export type AnexoEnviado = {
  caminho: string;
  content_type: string;
  bytes: number;
  nome: string;
  /** sha-256 hex do arquivo — prova de integridade (ADR 0004) */
  hash: string;
};

export const FORMATO_HASH = /^[0-9a-f]{64}$/;

export async function sha256Hex(arquivo: Blob): Promise<string> {
  const buffer = await arquivo.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** o caminho precisa comecar pela locadora: criar_incidente e a policy do bucket checam */
export async function enviarAnexo(locadoraId: string, arquivo: File): Promise<AnexoEnviado> {
  const tipo = tipoDoArquivo(arquivo);
  if (!tipo) throw new Error(`${arquivo.name}: formato não aceito. Use foto (JPG, PNG, HEIC) ou PDF.`);
  const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : "bin";
  const caminho = `${locadoraId}/rascunho/${crypto.randomUUID()}.${extensao}`;
  const hash = await sha256Hex(arquivo);
  if (!FORMATO_HASH.test(hash)) throw new Error(`Falha ao hashear ${arquivo.name}`);

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: tipo,
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message}`);

  return {
    caminho,
    content_type: tipo,
    bytes: arquivo.size,
    nome: arquivo.name,
    hash,
  };
}

export async function removerAnexo(caminho: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([caminho]);
}

export async function urlsAssinadas(caminhos: string[]): Promise<Record<string, string>> {
  if (caminhos.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(caminhos, VALIDADE_URL_S);
  if (error || !data) return {};

  const mapa: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  }
  return mapa;
}

export function eImagem(contentType: string | null | undefined, caminho: string): boolean {
  if (contentType) return contentType.startsWith("image/");
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(caminho);
}

export function formatarBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
