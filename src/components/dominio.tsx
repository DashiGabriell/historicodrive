import {
  CONFIANCAS,
  ESTADOS,
  VARIANTE_ESTADO,
  type Confianca,
  type Estado,
} from "@/lib/dominio";
import { Alert, Badge, Button, Card, Skeleton } from "@/ui";

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ESTADOS[estado]}</Badge>;
}

export function ConfiancaBadge({ confianca }: { confianca: Confianca }) {
  return (
    <Badge variant={confianca === "alta" ? "primary" : "secondary"}>
      Confiança {CONFIANCAS[confianca].toLowerCase()}
    </Badge>
  );
}

export function CarregandoBloco({ linhas = 3 }: { linhas?: number }) {
  return (
    <Card className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
      <Skeleton height={18} width="35%" />
      {Array.from({ length: linhas }, (_, i) => (
        <Skeleton key={i} height={12} width={`${85 - i * 12}%`} />
      ))}
    </Card>
  );
}

export function ErroCarga({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <Alert variant="destructive" className="items-center justify-between">
      <span>{mensagem}</span>
      <Button variant="outline" size="sm" onClick={onTentar}>
        Tentar de novo
      </Button>
    </Alert>
  );
}
