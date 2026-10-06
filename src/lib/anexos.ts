import { supabase } from "./supabase";

const BUCKET = "anexos";
const VALIDADE_URL_S = 60 * 60;

export const TIPOS_ACEITOS = "image/*,application/pdf";
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;

export type AnexoEnviado = {
  caminho: string;
  content_type: string;
  bytes: number;
  nome: string;
};

/** o caminho precisa comecar pela locadora: criar_incidente e a policy do bucket checam */
export async function enviarAnexo(locadoraId: string, arquivo: File): Promise<AnexoEnviado> {
  const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : "bin";
  const caminho = `${locadoraId}/rascunho/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message}`);

  return {
    caminho,
    content_type: arquivo.type,
    bytes: arquivo.size,
    nome: arquivo.name,
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
