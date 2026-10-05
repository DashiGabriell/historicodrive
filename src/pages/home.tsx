import { ButtonLink } from "@/ui";

const RESUMO =
  "Consulte em segundos se um motorista já gerou prejuízo para alguma locadora da rede — histórico de incidentes, estados e evidências em um só lugar.";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20">
      <div className="flex w-full max-w-2xl flex-col items-center text-center">
        <img
          src="/logo.png"
          alt="Logo do HistóricoDrive"
          width={128}
          height={128}
          className="h-32 w-32"
        />
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Histórico<span className="text-primary">Drive</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">{RESUMO}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/styleguide" size="lg">
            Ver design system
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
