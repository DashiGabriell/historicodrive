import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { instalarApp, useInstalacao } from "@/lib/pwa";
import { Button, type ButtonSize, type ButtonVariant } from "@/ui";

type BotaoInstalarAppProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
};

/** some quando o app já está instalado ou o navegador não permite instalar */
export function BotaoInstalarApp({
  variant = "outline",
  size = "md",
  className,
  children = "Instalar o app",
}: BotaoInstalarAppProps) {
  const modo = useInstalacao();
  const [instrucoesAbertas, setInstrucoesAbertas] = useState(false);

  if (modo === "instalado" || modo === "indisponivel") return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          if (modo === "nativo") void instalarApp();
          else setInstrucoesAbertas(true);
        }}
      >
        {children}
      </Button>
      {modo === "ios" || modo === "manual"
        ? createPortal(
            <FolhaInstrucoes
              modo={modo}
              aberta={instrucoesAbertas}
              onFechar={() => setInstrucoesAbertas(false)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function IconeCompartilhar() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="ícone Compartilhar"
      role="img"
      className="inline-block align-text-bottom"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2" />
    </svg>
  );
}

const PASSOS: Record<"ios" | "manual", ReactNode[]> = {
  ios: [
    <>
      Toque em <strong>Compartilhar</strong> <IconeCompartilhar /> na barra do navegador.
    </>,
    <>
      Role as opções e toque em <strong>Adicionar à Tela de Início</strong>.
    </>,
    <>
      Confirme em <strong>Adicionar</strong>. O ícone do Histórico aparece junto dos seus
      apps.
    </>,
  ],
  manual: [
    <>
      Abra o menu do navegador (<strong>⋮</strong> no canto da tela).
    </>,
    <>
      Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
    </>,
    <>
      Confirme. O ícone do Histórico aparece junto dos seus apps.
    </>,
  ],
};

function FolhaInstrucoes({
  modo,
  aberta,
  onFechar,
}: {
  modo: "ios" | "manual";
  aberta: boolean;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (aberta && !dlg.open) {
      if (typeof dlg.showModal === "function") dlg.showModal();
      else dlg.setAttribute("open", "");
    } else if (!aberta && dlg.open) {
      dlg.close?.();
      dlg.removeAttribute("open");
    }
  }, [aberta]);

  return (
    <dialog
      ref={ref}
      className="folha"
      aria-labelledby="titulo-instalar"
      onClose={onFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="folha-topo">
        <span className="folha-alca" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12"
            style={{ borderRadius: 12 }}
          />
          <div className="min-w-0">
            <strong id="titulo-instalar" className="block">
              Instalar o Histórico
            </strong>
            <span className="hint">
              Abre direto da tela inicial, em tela cheia, como um aplicativo.
            </span>
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {PASSOS[modo].map((passo, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="step-num shrink-0">{i + 1}</span>
            <span className="pt-0.5">{passo}</span>
          </li>
        ))}
      </ol>

      {modo === "ios" ? (
        <p className="hint">
          No iPhone a instalação é sempre feita por esse menu: a Apple não permite que um
          site se instale sozinho.
        </p>
      ) : null}

      <Button variant="primary" size="lg" onClick={onFechar}>
        Entendi
      </Button>
    </dialog>
  );
}
