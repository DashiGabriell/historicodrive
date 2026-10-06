import type { BadgeVariant } from "@/ui";

export type Estado = "suspeita" | "confirmado" | "contestado";
export type Confianca = "baixa" | "media" | "alta";
export type TipoIncidente =
  "dano_veiculo" | "fraude_documental" | "nao_devolucao" | "uso_indevido";

export const TIPOS: Record<TipoIncidente, string> = {
  dano_veiculo: "Dano ao veículo",
  fraude_documental: "Fraude documental",
  nao_devolucao: "Não devolução",
  uso_indevido: "Uso indevido",
};

export const ESTADOS: Record<Estado, string> = {
  suspeita: "Suspeita",
  confirmado: "Confirmado",
  contestado: "Contestado",
};

export const CONFIANCAS: Record<Confianca, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const VARIANTE_ESTADO: Record<Estado, BadgeVariant> = {
  suspeita: "warning",
  confirmado: "destructive",
  contestado: "secondary",
};

export const MAX_ANEXOS = 6;

export const ACOES: Record<string, string> = {
  "locadora.solicitar": "Cadastro solicitado",
  "locadora.aprovar": "Locadora aprovada",
  "locadora.recusar": "Locadora recusada",
  "locadora.atualizar": "Dados da locadora alterados",
  "locadora.rede": "Recebimento da rede alterado",
  "motorista.criar": "Motorista cadastrado",
  "incidente.criar": "Incidente registrado",
  "incidente.confirmado": "Incidente confirmado",
  "incidente.contestado": "Incidente contestado",
  "incidente.suspeita": "Incidente voltou a suspeita",
  "contestacao.abrir": "Contestação aberta",
  "contestacao.procedente": "Contestação procedente",
  "contestacao.improcedente": "Contestação improcedente",
  "conta.papel": "Papel da conta alterado",
  "retencao.suspeitas": "Suspeitas vencidas expurgadas",
};

export function rotuloAcao(acao: string): string {
  return ACOES[acao] ?? acao;
}

/** espelha mudar_estado_incidente: nada volta para suspeita */
const TRANSICOES: Record<Estado, Estado[]> = {
  suspeita: ["confirmado", "contestado"],
  confirmado: ["contestado"],
  contestado: ["confirmado"],
};

export function transicoesPermitidas(estado: Estado): Estado[] {
  return TRANSICOES[estado];
}

/** espelha incidente_visivel_para (ADR 0001) */
export function cruzaARede(estado: Estado, confianca: Confianca): boolean {
  return estado === "confirmado" && confianca === "alta";
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function normalizarPlaca(valor: string): string {
  return valor.toUpperCase().replace(/\s/g, "");
}

/** formato antigo (ABC-1234 / ABC1234) ou Mercosul (ABC1D23) */
export function placaValida(valor: string): boolean {
  const placa = normalizarPlaca(valor);
  return (
    /^[A-Z]{3}-?[0-9]{4}$/.test(placa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)
  );
}

export const PLACA_TAMANHO = 7;

/** posição a posição: 3 letras, 1 número, letra ou número (Mercosul), 2 números */
const PLACA_POSICOES = [/[A-Z]/, /[A-Z]/, /[A-Z]/, /\d/, /[A-Z\d]/, /\d/, /\d/];

/** máscara da digitação: descarta o que não cabe na posição e trava em 7 */
export function mascararPlaca(valor: string): string {
  let placa = "";
  for (const caractere of valor.toUpperCase()) {
    if (placa.length === PLACA_TAMANHO) break;
    if (PLACA_POSICOES[placa.length]?.test(caractere)) placa += caractere;
  }
  return placa;
}

export function placaCompleta(valor: string): boolean {
  return valor.length === PLACA_TAMANHO && placaValida(valor);
}

/** R$ 99.999.999,99: cabe no numeric(12,2) do banco com folga */
export const VALOR_MAXIMO_CENTAVOS = 9_999_999_999;

/** digitação estilo caixa eletrônico: só dígitos, preenchendo da direita */
export function centavosDeTexto(texto: string): string {
  const digitos = somenteDigitos(texto).replace(/^0+/, "");
  return digitos.slice(0, String(VALOR_MAXIMO_CENTAVOS).length);
}

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "150000" -> "1.500,00"; vazio continua vazio */
export function formatarCentavos(centavos: string): string {
  if (centavos === "") return "";
  return decimal.format(Number(centavos) / 100);
}

export function reaisDeCentavos(centavos: string): number | null {
  return centavos === "" ? null : Number(centavos) / 100;
}

/** null quando o valor serve (inclusive vazio); senão, a mensagem do erro */
export function erroDoValor(centavos: string): string | null {
  if (centavos === "") return null;
  if (!/^\d+$/.test(centavos)) return "Valor inválido.";
  const n = Number(centavos);
  if (n <= 0) return "Informe um valor maior que zero ou deixe o campo vazio.";
  if (n > VALOR_MAXIMO_CENTAVOS) return "Valor acima do limite de R$ 99.999.999,99.";
  return null;
}

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function formatarCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatarCnpj(valor: string | null): string {
  if (!valor) return "—";
  const d = somenteDigitos(valor);
  if (d.length !== 14) return valor;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatarMoeda(valor: number | string | null): string {
  if (valor === null || valor === "") return "—";
  return moeda.format(Number(valor));
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  // date pura (yyyy-mm-dd) vira meia-noite local, nao UTC
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00`)
    : new Date(iso);
  return data.format(d);
}

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/** yyyy-mm-dd no fuso local, para input[type=date] */
export function dataIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
