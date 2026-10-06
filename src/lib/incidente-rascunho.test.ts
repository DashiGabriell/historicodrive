import { describe, expect, it } from "vitest";
import {
  normalizarRascunho,
  pendencias,
  rascunhoVazio,
  temConteudo,
  type RascunhoIncidente,
} from "./incidente-rascunho";

const HASH = "a".repeat(64);
const anexo = { caminho: "loc/x.jpg", content_type: "image/jpeg", bytes: 10, nome: "x.jpg", hash: HASH };

function completo(): RascunhoIncidente {
  return {
    ...rascunhoVazio(),
    passo: 2,
    anexos: [anexo],
    cpf: "529.982.247-25",
    nome: "Maria da Silva",
    nascimento: "1990-01-01",
    placa: "ABC1D23",
    descricao: "Devolveu o carro com a porta amassada.",
  };
}

describe("normalizarRascunho", () => {
  it("devolve o vazio para nada salvo", () => {
    expect(normalizarRascunho(null)).toEqual(rascunhoVazio());
  });

  it("converte o valor antigo em reais para centavos", () => {
    expect(normalizarRascunho({ valor: "1500" }).valorCentavos).toBe("150000");
    expect(normalizarRascunho({ valor: "1500.5" }).valorCentavos).toBe("150050");
    expect(normalizarRascunho({ valor: "abc" }).valorCentavos).toBe("");
  });

  it("descarta campos adulterados", () => {
    const r = normalizarRascunho({
      passo: 7,
      tipo: "toString",
      confianca: "constructor",
      valorCentavos: "12,50",
      placa: "abc-1234",
      motorista: { id: 1, nome: "x" },
      anexos: [anexo, { ...anexo, hash: "curto" }, null],
    });
    expect(r.passo).toBe(1);
    expect(r.tipo).toBe("dano_veiculo");
    expect(r.confianca).toBe("media");
    expect(r.valorCentavos).toBe("");
    expect(r.placa).toBe("ABC1234");
    expect(r.motorista).toBeNull();
    expect(r.anexos).toEqual([anexo]);
  });
});

describe("temConteudo", () => {
  it("só guarda quando algo foi preenchido", () => {
    expect(temConteudo(rascunhoVazio())).toBe(false);
    expect(temConteudo({ ...rascunhoVazio(), nome: "   " })).toBe(false);
    expect(temConteudo({ ...rascunhoVazio(), placa: "ABC" })).toBe(true);
  });
});

describe("pendencias", () => {
  it("nenhuma quando está completo, com prejuízo vazio", () => {
    expect(pendencias(completo())).toEqual([]);
  });

  it("aponta placa incompleta e valor zerado", () => {
    const faltas = pendencias({ ...completo(), placa: "ABC12", valorCentavos: "0" });
    expect(faltas).toHaveLength(2);
    expect(faltas[0]).toMatch(/7 caracteres/);
    expect(faltas[1]).toMatch(/maior que zero/);
  });

  it("não cobra CPF e nome quando o motorista já existe", () => {
    const r = { ...completo(), cpf: "", nome: "", nascimento: "", motorista: { id: "m1", nome: "Ana" } };
    expect(pendencias(r)).toEqual([]);
  });

  it("lista tudo no rascunho vazio", () => {
    expect(pendencias(rascunhoVazio()).length).toBeGreaterThanOrEqual(5);
  });
});
