import { useCallback, useEffect, useRef, useState } from "react";
import { mensagemDe } from "./rpc";

type Estado<T> = { alvo: string | null; dados: T | null; erro: string | null };

/** Carrega dados assincronos sempre que `chave` muda (null = nao carrega).
 *  Inclua na chave tudo de que a carga depende, inclusive a locadora ativa. */
export function useCarga<T>(chave: string | null, carregar: () => Promise<T>) {
  const carregarRef = useRef(carregar);
  useEffect(() => {
    carregarRef.current = carregar;
  });

  const [versao, setVersao] = useState(0);
  const [estado, setEstado] = useState<Estado<T>>({ alvo: null, dados: null, erro: null });
  const alvo = chave === null ? null : `${chave}#${versao}`;

  useEffect(() => {
    if (alvo === null) return;
    let ativo = true;
    carregarRef.current().then(
      (dados) => {
        if (ativo) setEstado({ alvo, dados, erro: null });
      },
      (causa: unknown) => {
        if (ativo) {
          setEstado({ alvo, dados: null, erro: mensagemDe(causa, "Não foi possível carregar.") });
        }
      },
    );
    return () => {
      ativo = false;
    };
  }, [alvo]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  // ao recarregar a mesma chave, mantem o dado anterior na tela; chave nova zera
  const mesmaChave = chave !== null && estado.alvo?.startsWith(`${chave}#`) === true;

  return {
    dados: mesmaChave ? estado.dados : null,
    erro: estado.alvo === alvo ? estado.erro : null,
    carregando: alvo !== null && estado.alvo !== alvo,
    recarregar,
  };
}
