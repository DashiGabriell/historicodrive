# ADR 0004 — Postura legal e papéis (controlador / operador)

**Status:** aceito · **Data:** 2026-10-06 · **Decisões de apoio:** Q2=B, Q8=B, Q12=B, Q16

## Contexto

O Histórico compartilha registros de incidentes entre locadoras. Em qualquer ação judicial ou fiscal envolvendo **motorista** (titular), alguém precisa responder: quem tratou o dado, por quê, com que base e com que controle. Sem papéis claros, o desenvolvedor vira coautor de toda decisão ruim de todo balcão da rede.

O produto já assume que cada locadora registra, confirma e decide o que entra na rede (toggle `receber_da_rede`, estados, confiança). Quem opera a ferramenta não decide esses fatos — só provê o meio.

## Decisão

**Papéis LGPD do Histórico:**

| Papel        | Quem                                                                 | O que faz / não faz                                                                 |
| ------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Controladora** | Cada **locadora** aprovada que registra ou recebe incidentes         | Define finalidade e meios do dado de motorista que coleta/confirma; responde ao titular |
| **Operadora**    | **Desenvolvedor do Histórico** (você)                                | Processa dado conforme instruções da locadora; não decide finalidade do dado de motorista |
| **Titular**      | **Motorista** (CPF como identidade)                                  | Pode contestar, pedir informações e exercer direitos LGPD via canal do operador    |

**Regras derivadas:**

1. **Locadora = controladora.** O registro de incidente, anexo, busca e confirmação são atos da locadora. Ela responde pela veracidade e pela base do dado.
2. **Dev = operador.** Papéis de `superadmin` limitam-se a: aprovar/recusar locadoras, intervir em contestação quando a locadora não responde no prazo, e manter a plataforma. **`superadmin` não lê** `motorista`, `incidente`, ficha ou busca (Q8=B, Q16) — a negação é em RPC/RLS, não só na UI.
3. **Contestação é direito do titular** (Q3=C, Q11=C, Q12=B): formulário público com **verificação de CPF**; ao abrir, o incidente alvo transiciona para `contestado` (sai da rede — ADR 0001); a **locadora dona** decide; o `superadmin` decide como recurso se a locadora não responder em **15 dias úteis**.
4. **Prova de acesso:** toda abertura de ficha/busca grava `consulta_log` append-only (`perfil_id`, `locadora_id`, `motorista_id`, `timestamp`) — sem termo digitado, sem contagem de incidentes (Q17=A).
5. **Integridade de anexo:** SHA-256 no upload, coluna em `anexo`, hash no audit (Q18=A).
6. **Notificação de cruzamento:** quando um incidente `confirmado`+`alta` passa a ser visível na rede, a locadora dona recebe badge no incidente + alerta in-app (e-mail depois) (Q15).

## Consequências

- Em processo, a defesa se apoia em: (i) papéis escritos; (ii) RPC que **impede** leitura de superadmin; (iii) audit append-only; (iv) contestação com prazo e transição automática para `contestado`; (v) termos de locadora aceitos com versão e timestamp.
- “O dev via os dados” deixa de ser a pergunta; a resposta é arquitetural: **a função nega**.
- Contestar bem documentado **reduz** passivo: `contestado` não cruza a rede e o audit prova quem decidiu.
- Locadora que ignora prazo de contestação perde o recurso para o operador — incentivo a responder.
- Qualquer RPC novo de leitura passa pela pergunta: **superadmin consegue ler motorista/incidente?** Se sim, está errado.

## Alternativas consideradas

- **(A) Dev como controlador único** — absorve decisão de cada balcão; passivo total da rede no operador.
- **(B) Controladores joint (dev + locadoras)** — titular processa todos; pior para o dev e para a separação de papéis.
- **(C) Status quo sem restrição de superadmin** — defesa afirma sem provar; pergunta “o dev podia ver?” fica aberta.

## Fonte

Decisões da sessão de grilling legal (2026-10-06): Q2, Q3, Q8, Q9, Q11, Q12, Q15, Q16, Q17, Q18.
Rascunho para revisão de advogado — não é parecer jurídico.
