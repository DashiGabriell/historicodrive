import { supabase } from "./supabase";

/** mensagens cruas das RPCs (sem acento, em snake de dev) para texto de tela */
const TRADUCOES: Array<[RegExp, string]> = [
  [
    /nenhuma locadora ativa/,
    "Sua locadora ainda não foi aprovada ou não há locadora ativa.",
  ],
  [/nao autenticado|perfil nao encontrado/, "Sua sessão expirou. Entre de novo."],
  [/acesso negado/, "Sua conta não tem permissão para esta ação."],
  [/termo de busca muito curto/, "Digite ao menos 3 caracteres."],
  [/confirme o CPF/i, "Confirme o CPF completo para abrir a ficha."],
  [
    /registro nao encontrado|incidente nao encontrado|motorista nao encontrado/,
    "Registro não encontrado.",
  ],
  [
    /cpf ja cadastrado com outro nome/,
    "Este CPF já está cadastrado com outro nome. Confira a grafia do nome completo.",
  ],
  [/cpf invalido/, "CPF inválido."],
  [/cnpj invalido/, "CNPJ inválido: use os 14 dígitos."],
  [/uf invalida/, "UF inválida: use a sigla com 2 letras."],
  [/nome completo invalido/, "Informe o nome completo do motorista."],
  [/placa invalida/, "Placa inválida. Use ABC-1234 ou ABC1D23."],
  [/descricao precisa/, "A descrição precisa de ao menos 10 caracteres."],
  [/valor invalido/, "Valor inválido."],
  [/ao menos uma foto/, "Envie ao menos uma foto ou documento."],
  [/maximo de 6 anexos/, "Máximo de 6 anexos por incidente."],
  [/anexo/, "Um dos anexos é inválido. Remova e envie de novo."],
  [/toda transicao exige motivo/, "Informe o motivo (ao menos 5 caracteres)."],
  [/transicao .* nao permitida/, "Essa mudança de estado não é permitida."],
  [/estado ja e/, "O incidente já está nesse estado."],
  [/recusa exige motivo/, "A recusa exige um motivo (ao menos 5 caracteres)."],
  [/decisao exige motivo/, "A decisão exige um motivo (ao menos 5 caracteres)."],
  [/aceite dos termos obrigatorio/, "Aceite os Termos de uso para continuar."],
  [
    /versao dos termos obrigatoria|versao dos termos invalida/,
    "Versão dos Termos inválida. Recarregue a página.",
  ],
  [
    /ja existe contestacao aberta/,
    "Já existe uma contestação aberta para este incidente.",
  ],
  [/contestacao ja decidida/, "Esta contestação já foi decidida."],
  [/recurso so apos o prazo/, "O recurso só vale depois do prazo da locadora."],
  [
    /muitas tentativas/,
    "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.",
  ],
  [/data de nascimento obrigatoria/, "Informe a data de nascimento do motorista."],
  [
    /data de nascimento invalida/,
    "Data de nascimento inválida: o motorista precisa ter 18 anos ou mais.",
  ],
  [/periodo invalido/, "Período inválido: a data inicial vem depois da final."],
  [/locadora_cnpj_uniq|duplicate key.*cnpj/, "Já existe uma locadora com este CNPJ."],
  [/tipo de comunicado invalido/, "Escolha o tipo do comunicado."],
  [/titulo do comunicado/, "O título precisa de 3 a 120 caracteres."],
  [/texto do comunicado/, "O texto precisa de 1 a 2000 caracteres."],
  [/link do comunicado invalido/, "Link inválido: use um caminho do app (como /rascunhos) ou um endereço https://."],
  [/comunicado nao encontrado/, "Este comunicado já foi retirado."],
  [/papel invalido/, "Papel inválido."],
  [/nao altera o proprio papel/, "Você não altera o próprio papel."],
  [/ultimo superadmin/, "A plataforma precisa de ao menos um superadmin."],
];

export function traduzirErro(mensagem: string): string {
  for (const [padrao, texto] of TRADUCOES) {
    if (padrao.test(mensagem)) return texto;
  }
  return mensagem;
}

export function mensagemDe(causa: unknown, padrao: string): string {
  return causa instanceof Error ? causa.message : padrao;
}

export async function rpc<T>(nome: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(traduzirErro(error.message));
  return data as T;
}
