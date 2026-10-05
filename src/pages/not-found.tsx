import { ButtonLink, EmptyState } from "@/ui";
import { useTitulo } from "@/lib/use-titulo";

export default function NotFound() {
  useTitulo("Página não encontrada — HistóricoDrive");

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-20">
      <EmptyState
        title="Página não encontrada"
        description="O endereço não existe ou foi movido."
        action={<ButtonLink href="/">Voltar para o início</ButtonLink>}
      />
    </div>
  );
}
