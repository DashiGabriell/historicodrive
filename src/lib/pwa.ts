import { useSyncExternalStore } from "react";

/** aberto pelo ícone da tela inicial (PWA instalado), sem barra do navegador */
export function modoApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

function assinarConexao(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    assinarConexao,
    () => navigator.onLine,
    () => true,
  );
}
