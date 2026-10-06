import { FORMATO_HASH, type AnexoEnviado } from "./anexos";
import {
  CONFIANCAS,
  TIPOS,
  cpfValido,
  erroDoValor,
  mascararPlaca,
  placaCompleta,
  type Confianca,
  type TipoIncidente,
} from "./dominio";

export type RascunhoIncidente = {
  passo: 1 | 2;
  anexos: AnexoEnviado[];
  motorista: { id: string; nome: string } | null;
  cpf: string;
  nome: string;
  nascimento: string;
  placa: string;
  tipo: TipoIncidente;
  /** só dígitos, em centavos; vazio = prejuízo ainda não conhecido */
  valorCentavos: string;
  confianca: Confianca;
  descricao: string;
};

export function rascunhoVazio(): RascunhoIncidente {
  return {
    passo: 1,
    anexos: [],
    motorista: null,
    cpf: "",
    nome: "",
    nascimento: "",
    placa: "",
    tipo: "dano_veiculo",
    valorCentavos: "",
    confianca: "media",
    descricao: "",
  };
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

/** o que vem do storage pode ser de uma versão antiga ou adulterado: confere campo a campo */
export function normalizarRascunho(bruto: Record<string, unknown> | null): RascunhoIncidente {
  const r = rascunhoVazio();
  if (!bruto) return r;

  const motorista = bruto.motorista as { id?: unknown; nome?: unknown } | null | undefined;
  // valor antigo vinha em reais ("1500" ou "1500.5"); o atual é em centavos
  const valorLegado = texto(bruto.valor);
  const reais = Number(valorLegado);
  const centavos =
    texto(bruto.valorCentavos) ||
    (valorLegado !== "" && Number.isFinite(reais) && reais > 0
      ? String(Math.round(reais * 100))
      : "");

  return {
    passo: bruto.passo === 2 ? 2 : 1,
    // anexo sem hash (prova de integridade) não sobrevive ao envio
    anexos: (Array.isArray(bruto.anexos) ? (bruto.anexos as AnexoEnviado[]) : []).filter(
      (a) => typeof a?.caminho === "string" && typeof a.hash === "string" && FORMATO_HASH.test(a.hash),
    ),
    motorista:
      motorista && typeof motorista.id === "string" && typeof motorista.nome === "string"
        ? { id: motorista.id, nome: motorista.nome }
        : null,
    cpf: texto(bruto.cpf),
    nome: texto(bruto.nome),
    nascimento: texto(bruto.nascimento),
    placa: mascararPlaca(texto(bruto.placa)),
    tipo: Object.hasOwn(TIPOS, texto(bruto.tipo)) ? (bruto.tipo as TipoIncidente) : r.tipo,
    valorCentavos: /^\d*$/.test(centavos) ? centavos : "",
    confianca: Object.hasOwn(CONFIANCAS, texto(bruto.confianca))
      ? (bruto.confianca as Confianca)
      : r.confianca,
    descricao: texto(bruto.descricao),
  };
}

/** vale guardar: o usuário já começou a preencher algo */
export function temConteudo(r: RascunhoIncidente): boolean {
  return (
    r.anexos.length > 0 ||
    r.motorista !== null ||
    r.cpf !== "" ||
    r.nome.trim() !== "" ||
    r.placa !== "" ||
    r.valorCentavos !== "" ||
    r.descricao.trim() !== ""
  );
}

/** tudo o que impede o envio, na ordem em que aparece na tela */
export function pendencias(r: RascunhoIncidente): string[] {
  const faltas: string[] = [];
  if (r.anexos.length < 1) faltas.push("Envie ao menos uma foto ou documento.");
  if (!r.motorista) {
    if (!cpfValido(r.cpf)) faltas.push("CPF do motorista inválido.");
    if (r.nome.trim().length < 5 || r.nome.trim().split(/\s+/).length < 2) {
      faltas.push("Informe o nome completo do motorista.");
    }
    if (!r.nascimento) faltas.push("Informe a data de nascimento do motorista.");
  }
  if (!placaCompleta(r.placa)) {
    faltas.push("Placa inválida: use os 7 caracteres, como ABC1234 ou ABC1D23.");
  }
  const erroValor = erroDoValor(r.valorCentavos);
  if (erroValor) faltas.push(erroValor);
  if (r.descricao.trim().length < 10) {
    faltas.push("A descrição precisa de ao menos 10 caracteres.");
  }
  return faltas;
}
