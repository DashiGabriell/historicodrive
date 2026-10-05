"use client";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardDesc,
  CardTitle,
  DataTable,
  EmptyState,
  Field,
  Metric,
  Skeleton,
  Switch,
  Tabs,
  controlClass,
  type Column,
} from "@/ui";

const cores = [
  ["primary", "239 84% 67%"],
  ["success", "142 71% 45%"],
  ["warning", "38 92% 50%"],
  ["destructive", "0 84% 60%"],
  ["coin", "43 96% 56%"],
  ["muted", "210 20% 96%"],
  ["border", "220 13% 91%"],
  ["foreground", "222 47% 11%"],
] as const;

type Linha = { motorista: string; tipo: string; valor: string; estado: string };

const linhas: Linha[] = [
  {
    motorista: "João P. da Silva",
    tipo: "Dano ao veículo",
    valor: "R$ 1.450",
    estado: "confirmado",
  },
  {
    motorista: "Maria A. Souza",
    tipo: "Uso indevido",
    valor: "R$ 320",
    estado: "suspeita",
  },
  {
    motorista: "Carlos R. Lima",
    tipo: "Não devolução",
    valor: "R$ 2.100",
    estado: "contestado",
  },
];

const colunas: Array<Column<Linha>> = [
  { key: "motorista", header: "Motorista", render: (r) => r.motorista },
  { key: "tipo", header: "Tipo", render: (r) => r.tipo },
  { key: "valor", header: "Valor", align: "right", render: (r) => r.valor },
  {
    key: "estado",
    header: "Estado",
    render: (r) => (
      <Badge
        variant={
          r.estado === "confirmado"
            ? "destructive"
            : r.estado === "suspeita"
              ? "warning"
              : "secondary"
        }
      >
        {r.estado}
      </Badge>
    ),
  },
];

const abas = [
  { id: "geral", label: "Visão geral" },
  { id: "incidentes", label: "Incidentes" },
  { id: "anexos", label: "Anexos" },
];

function Titulo({ children, id }: { children: string; id: string }) {
  return (
    <h2
      id={id}
      className="text-xl font-bold tracking-tight border-b pb-2"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      {children}
    </h2>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <header className="mb-10">
        <p className="eyebrow">HistóricoDrive</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Design system</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "hsl(var(--muted-foreground))" }}>
          Fonte única do visual: <code>docs/estilo/tokens.css</code> seguido de{" "}
          <code>docs/estilo/tokens-3d.css</code> (variante plástica). Tailwind é usado
          só para layout.
        </p>
      </header>

      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-4">
          <Titulo id="cores">Cores</Titulo>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cores.map(([nome, hsl]) => (
              <div key={nome} className="card card-pad">
                <div
                  className="mb-3 h-12 rounded"
                  style={{ background: `hsl(${hsl})` }}
                />
                <div className="label" style={{ margin: 0 }}>
                  {nome}
                </div>
                <div className="hint">{hsl}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="botoes">Botões</Titulo>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="coin">Coin</Button>
            <Button variant="glow">Glow</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeno</Button>
            <Button size="lg">Grande</Button>
            <Button disabled>Desabilitado</Button>
            <Button variant="outline" size="sm">
              Ação secundária
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="badges">Badges</Titulo>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">primary</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="success">success</Badge>
            <Badge variant="warning">warning</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="coin">coin</Badge>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="forms">Formulários</Titulo>
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <Field label="CPF do motorista" htmlFor="cpf" hint="Só números" required>
                <input
                  id="cpf"
                  className={controlClass("input")}
                  placeholder="000.000.000-00"
                />
              </Field>
              <Field label="Tipo do incidente" htmlFor="tipo">
                <select id="tipo" className={controlClass("select")}>
                  <option>Dano ao veículo</option>
                  <option>Fraude documental</option>
                  <option>Não devolução</option>
                  <option>Uso indevido</option>
                </select>
              </Field>
            </Card>
            <Card className="flex flex-col gap-4">
              <Field label="Descrição" htmlFor="desc" hint="O que aconteceu">
                <textarea id="desc" className={controlClass("textarea")} />
              </Field>
              <Field label="Placa" htmlFor="placa" error="Placa inválida">
                <input
                  id="placa"
                  className={controlClass("input", true)}
                  defaultValue="ABC"
                />
              </Field>
            </Card>
          </div>
          <Card className="flex items-center justify-between">
            <span className="label" style={{ margin: 0 }}>
              Receber alertas da rede
            </span>
            <Switch
              checked
              onCheckedChange={() => undefined}
              label="Receber alertas da rede"
            />
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="cards">Cards & métricas</Titulo>
          <Card>
            <CardTitle>Incidente #1042</CardTitle>
            <CardDesc>Registrado por Locadora Alpha em 12/09/2026.</CardDesc>
          </Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric label="Prejuízo acumulado" value="R$ 12.480" />
            <Metric label="Incidentes no mês" value="7" tone="success" />
            <Metric label="Aguardando revisão" value="3" tone="warning" />
            <Metric label="Contestados" value="1" tone="destructive" />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="alertas">Alertas</Titulo>
          <div className="flex flex-col gap-3">
            <Alert variant="info">
              <strong>Busca por nome.</strong> Confirme o CPF antes de abrir a ficha.
            </Alert>
            <Alert variant="success">
              <strong>Incidente confirmado.</strong> Agora fica visível na rede.
            </Alert>
            <Alert variant="warning">
              <strong>Suspeita privada.</strong> Só a sua locadora vê este registro.
            </Alert>
            <Alert variant="destructive">
              <strong>Ops.</strong> Não foi possível salvar o rascunho.
            </Alert>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="tabs">Tabs & avatar</Titulo>
          <Tabs
            tabs={abas}
            value="geral"
            onValueChange={() => undefined}
            label="Seções da ficha"
          />
          <div className="flex items-center gap-3">
            <Avatar initials="AS" />
            <Avatar initials="PL" size="lg" />
            <Badge variant="secondary">Locadora Alpha</Badge>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="tabela">Tabela</Titulo>
          <DataTable
            columns={colunas}
            rows={linhas}
            rowKey={(r) => r.motorista}
            caption="Incidentes de exemplo"
          />
        </section>

        <section className="flex flex-col gap-4">
          <Titulo id="estados">Estados vazios & skeleton</Titulo>
          <EmptyState
            title="Nenhum incidente ainda"
            description="Quando você registrar o primeiro, ele aparece aqui."
            action={<Button size="sm">Registrar incidente</Button>}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-3">
              <Skeleton height={16} width="40%" />
              <Skeleton height={12} width="80%" />
              <Skeleton height={12} width="65%" />
            </Card>
            <Card className="flex flex-col gap-3">
              <Skeleton height={96} />
              <Skeleton height={14} width="50%" />
            </Card>
            <Card className="flex items-center gap-3">
              <Skeleton height={40} width={40} circle />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton height={12} width="60%" />
                <Skeleton height={10} width="40%" />
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
