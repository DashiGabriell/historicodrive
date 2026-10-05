import { useEffect } from "react";

// Substitui `export const metadata` do App Router: cada tela declara o title.
export function useTitulo(titulo: string) {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
