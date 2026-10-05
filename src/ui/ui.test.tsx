import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  Field,
  Metric,
  controlClass,
  type Column,
} from "./index";

function html(node: ReactNode): string {
  return renderToStaticMarkup(<>{node}</>);
}

describe("Button", () => {
  it("usa a classe .btn e força type=button", () => {
    const out = html(<Button>SALVAR</Button>);
    expect(out).toContain('class="btn btn-primary"');
    expect(out).toContain('type="button"');
  });

  it("aplica variante e tamanho do design system", () => {
    const out = html(
      <Button variant="destructive" size="sm">
        EXCLUIR
      </Button>,
    );
    expect(out).toContain("btn btn-destructive btn-sm");
  });
});

describe("Badge", () => {
  it("mapeia a variante para badge-<variante>", () => {
    expect(html(<Badge variant="success">OK</Badge>)).toContain("badge badge-success");
  });
});

describe("Metric", () => {
  it("renderiza label e valor com tom opcional", () => {
    const out = html(<Metric label="Prejuízo" value="R$ 1.000" tone="warning" />);
    expect(out).toContain("metric");
    expect(out).toContain("value text-warning");
  });

  it("não pinta quando não há tom", () => {
    expect(html(<Metric label="Total" value="10" />)).toContain('class="value"');
  });
});

describe("Alert", () => {
  it("mapeia a variante para alert-<variante>", () => {
    expect(html(<Alert variant="destructive">erro</Alert>)).toContain(
      "alert alert-destructive",
    );
  });
});

describe("controlClass", () => {
  it("só o erro usa a classe input-error", () => {
    expect(controlClass("input")).toBe("input");
    expect(controlClass("select", true)).toBe("select input-error");
    expect(controlClass("textarea", true)).toBe("textarea input-error");
  });
});

describe("Field", () => {
  it("mostra hint quando não há erro e erro quando há", () => {
    const comHint = html(
      <Field label="CPF" hint="Só números">
        <input />
      </Field>,
    );
    expect(comHint).toContain("hint");
    expect(comHint).not.toContain("text-destructive");

    const comErro = html(
      <Field label="Placa" error="Placa inválida">
        <input />
      </Field>,
    );
    expect(comErro).toContain("text-destructive");
  });
});

describe("DataTable", () => {
  type Linha = { id: string; nome: string };
  const colunas: Array<Column<Linha>> = [
    { key: "nome", header: "Nome", render: (r) => r.nome },
  ];

  it("renderiza cabeçalho e linhas", () => {
    const out = html(
      <DataTable
        columns={colunas}
        rows={[{ id: "1", nome: "Ana" }]}
        rowKey={(r) => r.id}
      />,
    );
    expect(out).toContain("table-wrap");
    expect(out).toContain("table");
    expect(out).toContain("Ana");
  });

  it("usa o estado vazio quando não há linhas", () => {
    const out = html(
      <DataTable
        columns={colunas}
        rows={[]}
        rowKey={(r) => r.id}
        empty={<p>Nada por aqui</p>}
      />,
    );
    expect(out).not.toContain("table-wrap");
    expect(out).toContain("Nada por aqui");
  });
});
