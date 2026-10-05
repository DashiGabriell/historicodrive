import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const globalsCss = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
const tokensCss = readFileSync(resolve(root, "docs/estilo/tokens.css"), "utf8");
const tokens3dCss = readFileSync(resolve(root, "docs/estilo/tokens-3d.css"), "utf8");

describe("design system ESTILO", () => {
  it("declar tokens essenciais em tokens.css", () => {
    for (const token of [
      "--background",
      "--foreground",
      "--primary",
      "--destructive",
      "--warning",
      "--success",
      "--radius",
      "--font",
    ]) {
      expect(tokensCss).toContain(`${token}:`);
    }
  });

  it("declara as classes de componente usadas pela aplicação", () => {
    for (const className of [
      ".btn",
      ".btn-primary",
      ".card",
      ".badge",
      ".input",
      ".table",
      ".metric",
      ".alert",
      ".skeleton",
      ".switch",
    ]) {
      expect(tokensCss).toMatch(new RegExp(`\\${className}\\b`));
    }
  });

  it("traz a variante plastifica em tokens-3d.css", () => {
    expect(tokens3dCss).toContain("--plastic-raised:");
    expect(tokens3dCss).toContain("--btn-3d-primary:");
    expect(tokens3dCss).toContain("--press-ms:");
  });

  it("importa tokens.css antes de tokens-3d.css e ambos na camada components", () => {
    const base = globalsCss.indexOf('tokens.css" layer(components)');
    const three = globalsCss.indexOf('tokens-3d.css" layer(components)');

    expect(base).toBeGreaterThan(-1);
    expect(three).toBeGreaterThan(base);
  });

  it("carrega o Tailwind antes do design system", () => {
    expect(globalsCss.indexOf('@import "tailwindcss"')).toBeLessThan(
      globalsCss.indexOf("docs/estilo/tokens.css"),
    );
  });
});
