import { describe, expect, it } from "vitest";
import { FORMATO_HASH, sha256Hex, tipoDoArquivo } from "./anexos";

describe("tipoDoArquivo", () => {
  it("usa o type do navegador quando o bucket aceita", () => {
    expect(tipoDoArquivo({ name: "IMG_0001.JPG", type: "image/jpeg" })).toBe("image/jpeg");
    expect(tipoDoArquivo({ name: "contrato.pdf", type: "application/pdf" })).toBe("application/pdf");
  });

  it("deduz pela extensão quando o iOS entrega sem type", () => {
    expect(tipoDoArquivo({ name: "IMG_0002.HEIC", type: "" })).toBe("image/heic");
    expect(tipoDoArquivo({ name: "foto.jpeg", type: "" })).toBe("image/jpeg");
  });

  it("recusa o que o bucket não aceita", () => {
    expect(tipoDoArquivo({ name: "anim.gif", type: "image/gif" })).toBeNull();
    expect(tipoDoArquivo({ name: "sem-extensao", type: "" })).toBeNull();
    expect(tipoDoArquivo({ name: "video.mov", type: "video/quicktime" })).toBeNull();
  });
});

describe("sha256Hex (prova de integridade do anexo)", () => {
  it("devolve 64 hex minusculos", async () => {
    const hash = await sha256Hex(new Blob(["historico"]));
    expect(hash).toMatch(FORMATO_HASH);
    expect(hash).toBe(hash.toLowerCase());
  });

  it("e deterministico e sensivel ao conteudo", async () => {
    const a = await sha256Hex(new Blob(["foto-1"]));
    const b = await sha256Hex(new Blob(["foto-1"]));
    const c = await sha256Hex(new Blob(["foto-2"]));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("conhece o digest do vetor conhecido 'abc'", async () => {
    // ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const hash = await sha256Hex(new Blob(["abc"]));
    expect(hash).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
