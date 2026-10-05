# ADR 0001 — Visibilidade da rede e a regra anti-marketplace

**Status:** aceito · **Data:** 2026-10-05 · **Decisões de apoio:** Q8=C, Q14=B, Q15=A, Q24=B

## Contexto

O produto é uma **rede de locadoras** que compartilham o histórico de motoristas que geraram prejuízo. Três forças se opõem:

1. A rede só vale algo se o `confirmado` de uma locadora chegar nas outras.
2. Um registro fraco (`suspeita`) que vaza vira boato sobre o concorrente e destrói a confiança na rede.
3. Qualquer forma de **listagem** de motoristas transforma a plataforma num cadastro consultável — efeitos de "marketplace" de pessoas, base de clientes exposta, enumeração.

## Decisão

**Visibilidade em três camadas:**

| Camada                                   | Quem vê                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `suspeita` (qualquer confiança)          | **só** a locadora que criou                                             |
| `confirmado` com `confiança = alta`      | a locadora dona **+** as locadoras da rede com `receber_da_rede = true` |
| `confirmado` com `confiança baixa/média` | **só** a locadora dona                                                  |
| `contestado`                             | **só** a locadora dona                                                  |

**Regra anti-marketplace (invariante de projeto):**

> Dado registrado é **buscável**, nunca **listável**.

Nenhuma tela, endpoint, RPC ou paginação devolve motoristas, incidentes ou "recentes" sem que o usuário tenha digitado um **CPF** (match exato) ou um **nome completo** (match exato). Não existe feed, ordenação geral, autocomplete de motorista, "quem mais apareceu" nem contagem agregada de motoristas.

**Anexo nunca cruza a rede.** O `anexo` é prova interna da locadora dona (fotos de dano mostram placa, CNPJ, endereço, outros clientes). A rede vê apenas: tipo, data, descrição, `valor`, `estado`, `confiança`, locadora autora e — para quem tem CPF completo — o dado cadastral mascarado (`***.456.789-**`).

**Escuta é assimétrica.** O toggle único `receber_da_rede` (default `true` na aprovação) controla **o que a locadora recebe**. Desligar tira ela dos alertas, mas os `confirmado` dela continuam entrando na rede — dá o alerta de graça, não se paga em reciprocidade.

## Consequências

- Leitura de `motorista` e `incidente` **não pode** ser uma `select` comum — precisa de uma função que implementa as três camadas. Ver [ADR 0003](0003-stack-sem-orm.md).
- A rede nasce "às cegas": uma locadora só descobre que um motorista é problema **quando procura por ele**. Isso é proposital.
- O KPI do painel é **só da própria locadora** (Q18=A) — rede é contexto, não faturamento.
- Quebrar a regra é falha de segurança, não erro de UI. Cada endpoint novo passa por essa pergunta: _ele lista algo?_

## Alternativas consideradas

- **(A) Registro privado + rede só de alertas anônimos** — perde o valor de "quem registrou"; concorrente não confia em alerta sem autor.
- **(B) Transparência total, todos veem tudo** — vira dossiê nacional de clientes; `suspeita` viraria boato.
- **(D) Dois toggles (enviar/receber)** — honesto, mas todo mundo desliga por padrão e a rede nasce vazia.
