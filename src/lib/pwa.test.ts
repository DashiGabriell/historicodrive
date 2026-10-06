import { describe, expect, it } from "vitest";
import { eIos, modoInstalacao } from "./pwa";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const base = { instalado: false, temAviso: false, toques: 0 };

describe("eIos", () => {
  it("reconhece iPhone e o iPad que se diz Macintosh", () => {
    expect(eIos(IPHONE, 5)).toBe(true);
    expect(eIos(IPAD, 5)).toBe(true);
  });

  it("não confunde Mac de mesa nem Android", () => {
    expect(eIos(IPAD, 0)).toBe(false);
    expect(eIos(ANDROID, 5)).toBe(false);
  });
});

describe("modoInstalacao", () => {
  it("instalado vence tudo", () => {
    expect(modoInstalacao({ ...base, instalado: true, temAviso: true, userAgent: ANDROID })).toBe(
      "instalado",
    );
  });

  it("usa a janela nativa quando o navegador entregou o aviso", () => {
    expect(modoInstalacao({ ...base, temAviso: true, userAgent: ANDROID })).toBe("nativo");
    expect(modoInstalacao({ ...base, temAviso: true, userAgent: DESKTOP })).toBe("nativo");
  });

  it("no iPhone mostra o passo a passo do Compartilhar", () => {
    expect(modoInstalacao({ ...base, userAgent: IPHONE, toques: 5 })).toBe("ios");
  });

  it("celular sem aviso nativo instala pelo menu do navegador", () => {
    expect(modoInstalacao({ ...base, userAgent: ANDROID, toques: 5 })).toBe("manual");
  });

  it("desktop sem aviso nativo esconde o botão", () => {
    expect(modoInstalacao({ ...base, userAgent: DESKTOP })).toBe("indisponivel");
  });
});
