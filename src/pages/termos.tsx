import { Link } from "react-router-dom";
import { useTitulo } from "@/lib/use-titulo";
import { TERMOS_RESUMO, TERMOS_TITULO, TERMOS_VERSAO } from "@/lib/termos";
import { ButtonLink, Card, CardDesc, CardTitle, PageHeader } from "@/ui";

export default function Termos() {
  useTitulo("Termos de uso · Histórico");

  return (
    <div className="container flex max-w-3xl flex-col gap-6 py-6 sm:py-10">
      <PageHeader
        eyebrow="Legal"
        title={TERMOS_TITULO}
        description={`Versão ${TERMOS_VERSAO}. Rascunho para revisão jurídica — não constitui aconselhamento legal.`}
      />

      <Card className="flex flex-col gap-5">
        {TERMOS_RESUMO.map((bloco) => (
          <section key={bloco.titulo}>
            <CardTitle>{bloco.titulo}</CardTitle>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {bloco.texto}
            </p>
          </section>
        ))}
        <CardDesc>
          O texto completo está em docs/juridico/termos-locadora-v1.md no repositório
          e deve ser validado por advogado antes da produção.
        </CardDesc>
      </Card>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/cadastro" variant="outline">
          Voltar ao cadastro
        </ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Início
        </ButtonLink>
        <Link to="/contestar" className="self-center text-sm text-primary underline">
          Sou motorista: contestar registro
        </Link>
      </div>
    </div>
  );
}
