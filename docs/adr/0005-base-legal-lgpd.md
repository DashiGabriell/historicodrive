# ADR 0005 — Base legal LGPD e balanceamento

**Status:** aceito · **Data:** 2026-10-06 · **Decisões de apoio:** Q6, Q7=C, Q19=A, Q13=A

**Aviso:** rascunho técnico-legal para advogado. Jurisdição assumida: **Brasil**, Lei nº 13.709/2018 (LGPD). Não substitui parecer.

## Contexto

O Histórico trata dados pessoais sensíveis em efeito prático: **CPF**, nome completo, data de nascimento, foto e **histórico de incidentes** atribuídos à pessoa. O produto tem dois momentos distintos:

1. **Coleta e registro** — locadora cria ficha de motorista e incidente no balcão.
2. **Compartilhamento na rede** — `incidente` em `confirmado` com `confiança = alta` fica visível para outras locadoras aprovadas com `receber_da_rede = true`.

Sem base legal escrita e sem limites de retenção, o produto é atacado como “lista negra” sem salvaguardas, e o operador herda o problema da controladora.

## Decisão

### Base legal por momento

| Momento                              | Controladora | Base legal (rascunho)                                                                                                                                                              |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cadastro da locadora e da ficha      | Locadora     | **Legítimo interesse** (proteção do patrimônio / frota) + **exercício regular de direito** em contrato de locação, quando houver                                       |
| Registro de `incidente`              | Locadora     | Idem; finalidade: documentar fato que gerou ou poderia gerar prejuízo                                                                                                               |
| Consulta no balcão (busca/ficha)     | Locadora     | Legítimo interesse da locadora em avaliar risco **na própria operação**; dados só abrem com CPF/nome exato + confirmação (ADR 0002)                                                  |
| Compartilhamento na rede             | Locadoras receptoras | **Legítimo interesse das receptoras**, restrito a `confirmado`+`alta`, com opt-out (`receber_da_rede`); nunca `suspeita`/`contestado`/confiança baixa-média (ADR 0001)         |
| Operação da plataforma pelo dev      | — (operador) | Execução de contrato com a locadora / instrução da controladora; **não** decide finalidade                                                                                           |

### Salvaguardas (parte do balanceamento)

- Rede é **buscável, não listável** (ADR 0001): sem feed, sem enumeração, sem “recentes”.
- `suspeita` e `contestado` **não** cruzam a rede.
- Anexo **nunca** sai da locadora dona.
- Canal de contestação do titular com verificação de **CPF + data de nascimento** e limite de tentativas (por CPF, por IP e global; chaves guardadas como HMAC); ao abrir, incidente vai para `contestado`. Improcedente não reabre pelo canal público.
- `superadmin` **sem** leitura de motorista/incidente (ADR 0004).
- `consulta_log` e `audit_log` append-only.
- Termos da locadora com cláusulas de responsabilidade e aceite auditado.

### Retenção

| Dado                                   | Política                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `incidente` em `suspeita` nunca confirmada | **Purge em 30 dias**, diário via `pg_cron` (`aplicar_retencao`). Default fixo no produto (Q13=A) |
| `incidente` em `confirmado`/`contestado` | **Purge em 5 anos** contados do registro, com contestações e anexos (revisão 2026-10-06, substitui a retenção indefinida de Q19=A) |
| Ficha de `motorista` sem incidente     | Apagada no job diário (CPF e nome sem finalidade)                                                  |
| `consulta_log`, `audit_log`            | Append-only; no expurgo, `antes`/`depois` do alvo são minimizados (fica ação, autor, data, estado; saem placa, descrição, motivo, ids do motorista). `consulta_log` guarda só o uuid do motorista |
| Anexo                                  | Segue o `incidente` dono; hash SHA-256 no upload. No expurgo, o arquivo sai pela Storage API (fila `anexo_descarte`, job `hd-descarte-anexos`). Rascunho órfão some em 2 dias |
| Rascunho no navegador                  | `sessionStorage`, apagado no logout                                                                |

### Direitos do titular (motorista)

- **Contestar** via formulário `/contestar` com CPF + data de nascimento (Q11=C): o sistema só confirma *há ficha / não há ficha* (nunca lista incidente, locadora ou `suspeita`) e, se houver, abre um pedido por incidente confirmado com nome, e-mail e descrição. Ficha sem data de nascimento não se verifica pelo canal público: o titular usa o canal do operador.
- Pedidos de **informação, correção ou eliminação** tratados pelo canal do operador encaminhando à controladora (locadora dona do registro), com registro em audit.

## Consequências

- Balanceamento de legítimo interesse fica **escrito e versionado** — é o primeiro documento que ANPD/juiz pede.
- Retenção de `confirmado` limitada a 5 anos (alternativa C adotada na revisão); `suspeita` órfã não eterniza boato.
- Contenção de `superadmin` e log de consulta são **salvaguardas operacionais**, não cosmética.
- Se o produto sair do Brasil ou mudar finalidade (ex.: scoring de crédito), esta ADR **não** cobre — nova decisão obrigatória.

## Alternativas consideradas

- **(A) Consentimento como base única** — balcão não consegue colher consentimento válido do motorista na hora; frágil.
- **(B) Retenção indeterminada para tudo** — maximiza prova, maximiza passivo LGPD.
- **(C) Retenção 5 anos para `confirmado` e anonimização** — mais “LGPD-friendly”, enfraquece a rede a médio prazo; opção de revisão futura, não a adotada.

## Fonte

Sessão de grilling legal (2026-10-06): Q6, Q7, Q13, Q19. Em conjunto com ADR 0001 (visibilidade), ADR 0002 (CPF), ADR 0004 (papéis).
