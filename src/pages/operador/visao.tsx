import { Link } from "react-router-dom";
import { CarregandoBloco, ErroCarga } from "@/components/dominio";
import { rpc } from "@/lib/rpc";
import { useCarga } from "@/lib/use-carga";
import { useTitulo } from "@/lib/use-titulo";
import { Card, Metric, PageHeader } from "@/ui";

type Visao = {
  locadoras_pendentes: number;
  locadoras_aprovadas: number;
  locadoras_recusadas: number;
  contas_dono: number;
  contas_superadmin: number;
  recursos_vencidos: number;
  suspeitas_elegiveis: number;
  fila_descarte: number;
};

const ATALHOS: Array<{ href: string; titulo: string; texto: string }> = [
  {
    href: "/dashitecnology/locadoras",
    titulo: "Locadoras",
    texto: "Aprovar, recusar e ver quem já opera na rede.",
  },
  {
    href: "/dashitecnology/recursos",
    titulo: "Recursos",
    texto: "Contestações cujo prazo da locadora já venceu.",
  },
  {
    href: "/dashitecnology/contas",
    titulo: "Contas",
    texto: "Quem entra na plataforma e com qual papel.",
  },
  {
    href: "/dashitecnology/retencao",
    titulo: "Retenção",
    texto: "Suspeitas vencidas e fila de descarte de arquivos.",
  },
  {
    href: "/dashitecnology/trilha",
    titulo: "Trilha",
    texto: "Decisões de locadora, contestação e conta.",
  },
];

export default function OperadorVisao() {
  useTitulo("Visão · Operação · Histórico");
  const visao = useCarga("operador-visao", () => rpc<Visao>("operador_visao"));
  const v = visao.dados;

  return (
    <div className="container flex flex-col gap-6 py-6 sm:gap-8 sm:py-10">
      <PageHeader
        eyebrow="Operação"
        title="Visão da plataforma"
        description="Controle do operador: locadoras, contas, recurso e retenção. Ficha de motorista e incidente não aparecem aqui."
      />

      {visao.erro ? (
        <ErroCarga mensagem={visao.erro} onTentar={visao.recarregar} />
      ) : null}

      {!v && visao.carregando ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <CarregandoBloco key={i} linhas={1} />
          ))}
        </div>
      ) : v ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Metric
            label="Locadoras pendentes"
            value={v.locadoras_pendentes}
            tone={v.locadoras_pendentes > 0 ? "warning" : undefined}
          />
          <Metric
            label="Locadoras aprovadas"
            value={v.locadoras_aprovadas}
            tone="success"
          />
          <Metric
            label="Recursos vencidos"
            value={v.recursos_vencidos}
            tone={v.recursos_vencidos > 0 ? "destructive" : undefined}
          />
          <Metric label="Contas de dono" value={v.contas_dono} />
          <Metric label="Locadoras recusadas" value={v.locadoras_recusadas} />
          <Metric label="Superadmins" value={v.contas_superadmin} />
          <Metric
            label="Suspeitas elegíveis"
            value={v.suspeitas_elegiveis}
            tone={v.suspeitas_elegiveis > 0 ? "warning" : undefined}
          />
          <Metric label="Arquivos na fila" value={v.fila_descarte} />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ATALHOS.map((atalho) => (
          <Link key={atalho.href} to={atalho.href} className="block">
            <Card className="flex h-full flex-col gap-1">
              <p className="font-semibold">{atalho.titulo}</p>
              <p className="hint">{atalho.texto}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
