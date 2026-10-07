import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatarDataHora } from "@/lib/dominio";
import { TIPOS_COMUNICADO, linkInterno, type TipoComunicado } from "@/lib/notificacoes";
import { Badge, Card, buttonClassName, type BadgeVariant } from "@/ui";

const VARIANTE: Record<TipoComunicado, BadgeVariant> = {
  novidade: "primary",
  manutencao: "warning",
  importante: "destructive",
};

type Props = {
  tipo: TipoComunicado;
  titulo: string;
  corpo: string;
  link: string | null;
  criadoEm: string | null;
  naoLido?: boolean;
  onAbrirLink?: () => void;
  acoes?: ReactNode;
};

export function CartaoComunicado({
  tipo,
  titulo,
  corpo,
  link,
  criadoEm,
  naoLido,
  onAbrirLink,
  acoes,
}: Props) {
  return (
    <Card className="notificacao-item flex flex-col gap-3" data-nao-lida={naoLido || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={VARIANTE[tipo]}>{TIPOS_COMUNICADO[tipo]}</Badge>
        {naoLido ? <Badge variant="coin">Nova</Badge> : null}
        <span className="hint ml-auto">{criadoEm ? formatarDataHora(criadoEm) : "Agora"}</span>
      </div>
      <h3 className="notificacao-titulo">{titulo}</h3>
      <p className="whitespace-pre-line text-sm">{corpo}</p>
      {link || acoes ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {acoes}
          {link ? (
            linkInterno(link) ? (
              <Link to={link} className={buttonClassName("outline", "sm")} onClick={onAbrirLink}>
                Ver agora
              </Link>
            ) : (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName("outline", "sm")}
                onClick={onAbrirLink}
              >
                Abrir link
              </a>
            )
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
