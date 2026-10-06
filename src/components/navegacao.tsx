import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as EventoPonteiro,
} from "react";
import { NavLink } from "react-router-dom";
import { iniciais } from "@/lib/dominio";
import type { Perfil } from "@/lib/sessao-contexto";
import { Button, cx } from "@/ui";

export type NomeIcone =
  | "painel"
  | "buscar"
  | "registrar"
  | "auditoria"
  | "config"
  | "fila"
  | "mais"
  | "contestacao";

export type ItemMenu = {
  href: string;
  rotulo: string;
  curto?: string;
  icone: NomeIcone;
  destaque?: boolean;
  /** no celular sai da barra de abas e vai para a folha "Mais" */
  secundario?: boolean;
};

const TRACOS: Record<NomeIcone, string[]> = {
  painel: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  buscar: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "m21 21-4.3-4.3"],
  registrar: ["M12 5v14", "M5 12h14"],
  auditoria: [
    "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z",
    "M14 3v6h6",
    "M8 13h8",
    "M8 17h5",
  ],
  config: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  ],
  fila: ["M9 11l3 3 8-8", "M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"],
  mais: [
    "M6.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
    "M13.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
    "M20.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
  ],
  contestacao: [
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    "M12 7v4",
    "M12 14h.01",
  ],
};

export function Icone({ nome }: { nome: NomeIcone }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRACOS[nome].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

type BarraAbasProps = {
  itens: ItemMenu[];
  /** aba final que abre a folha com os itens secundários e a conta */
  mais?: { ativa: boolean; aberta: boolean; onAbrir: () => void };
};

export function BarraAbas({ itens, mais }: BarraAbasProps) {
  return (
    <nav aria-label="Navegação principal" className="tabbar md:hidden">
      {itens.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/incidente/novo"}
          className={cx("tabbar-item", item.destaque && "tabbar-item-destaque")}
        >
          <span className="tabbar-icone">
            <Icone nome={item.icone} />
          </span>
          <span className="tabbar-rotulo">{item.curto ?? item.rotulo}</span>
        </NavLink>
      ))}
      {mais ? (
        <button
          type="button"
          className="tabbar-item"
          aria-haspopup="dialog"
          aria-expanded={mais.aberta}
          aria-current={mais.ativa ? "page" : undefined}
          onClick={mais.onAbrir}
        >
          <span className="tabbar-icone">
            <Icone nome="mais" />
          </span>
          <span className="tabbar-rotulo">Mais</span>
        </button>
      ) : null}
    </nav>
  );
}

const PAPEIS: Record<Perfil["papel"], string> = {
  superadmin: "Superadmin",
  dono: "Dono da locadora",
};

type FolhaContaProps = {
  perfil: Perfil;
  aberta: boolean;
  onFechar: () => void;
  onTrocarLocadora: (id: string) => void;
  onSair: () => void;
  links?: ItemMenu[];
};

/** bottom sheet nativo (<dialog>): foco preso, Esc fecha, arrastar para baixo fecha */
export function FolhaConta({
  perfil,
  aberta,
  onFechar,
  onTrocarLocadora,
  onSair,
  links = [],
}: FolhaContaProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const inicioY = useRef<number | null>(null);
  const [arrasto, setArrasto] = useState(0);

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

  function comecar(e: EventoPonteiro<HTMLDivElement>) {
    inicioY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function mover(e: EventoPonteiro<HTMLDivElement>) {
    if (inicioY.current === null) return;
    setArrasto(Math.max(0, e.clientY - inicioY.current));
  }

  function soltar() {
    if (inicioY.current === null) return;
    inicioY.current = null;
    if (arrasto > 80) onFechar();
    setArrasto(0);
  }

  return (
    <dialog
      ref={ref}
      className="folha"
      aria-label={links.length > 0 ? "Mais opções" : "Sua conta"}
      onClose={onFechar}
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={
        arrasto
          ? { transform: `translateY(${arrasto}px)`, transition: "none" }
          : undefined
      }
    >
      <div
        className="folha-topo"
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <span className="folha-alca" aria-hidden="true" />
        <div className="flex items-center gap-3">
          <span className="avatar avatar-lg">{iniciais(perfil.nome)}</span>
          <div className="min-w-0">
            <strong className="block truncate">{perfil.nome}</strong>
            <span className="hint">{PAPEIS[perfil.papel]}</span>
          </div>
        </div>
      </div>

      {links.length > 0 ? (
        <nav aria-label="Mais seções" className="folha-grupo">
          {links.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className="folha-link"
              onClick={onFechar}
            >
              <span className="folha-link-icone">
                <Icone nome={item.icone} />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
              <svg
                className="folha-link-seta"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </NavLink>
          ))}
        </nav>
      ) : null}

      {perfil.locadoras.length > 0 ? (
        <fieldset className="folha-grupo">
          <legend className="eyebrow">
            {perfil.locadoras.length > 1 ? "Locadora ativa" : "Locadora"}
          </legend>
          {perfil.locadoras.map((locadora) => (
            <label key={locadora.id} className="folha-opcao">
              <span className="min-w-0 truncate">{locadora.nome}</span>
              <input
                type="radio"
                name="locadora-ativa"
                className="radio"
                checked={perfil.locadora_ativa === locadora.id}
                disabled={perfil.locadoras.length < 2}
                onChange={() => onTrocarLocadora(locadora.id)}
              />
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="lg" onClick={onSair}>
          Sair da conta
        </Button>
        <Button variant="ghost" size="lg" onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </dialog>
  );
}
