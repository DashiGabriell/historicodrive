# Spec — Defesa legal: prova, papéis e contestação

**Status:** ready-for-agent · **Data:** 2026-10-06 · **Vocabulário:** `docs/GLOSSARY.md` · **ADRs:** 0001–0005

## Problem Statement

O Histórico compartilha incidentes de motoristas entre locadoras. Hoje a **engenharia da prova** está incompleta: não há log de consulta, superadmin não está bloqueado tecnicamente de ler ficha, não há aceite de termos auditado, não há hash de anexo, não há fluxo de contestação do titular, não há purge de `suspeita` e não há teste automatizado da regra de visibilidade. Sem isso, uma ação de motorista (ou demanda LGPD) não tem dossiê técnico reproduzível — só narrativa.

## Solution

Implementar, na ordem das arestas de bloqueio, as salvaguardas e a trilha de prova fixadas em ADR 0004 e ADR 0005: papéis no banco, termos auditados, consulta auditada, bloqueio de `superadmin`, hash de anexo, contestação com verificação de CPF (incidente sai da rede na abertura), purge de `suspeita` em 30 dias, aviso de cruzamento na rede e teste automatizado da visibilidade.

## User Stories

1. Como **locadora (controladora)**, quero aceitar os Termos no cadastro com versão e timestamp, para que o aceite seja prova em eventual processo.
2. Como **locadora**, quero saber que `suspeita` nunca cruza a rede, para registrar com segurança operacional.
3. Como **locadora dona**, quero badge “visível na rede desde …” no incidente `confirmado`+`alta`, para saber quando o dado saiu da minha esfera.
4. Como **locadora dona**, quero alerta in-app quando meu incidente cruza a rede, para acompanhar o compartilhamento.
5. Como **motorista (titular)**, quero verificar se existe ficha com meu CPF e abrir contestação, para exercer contraditório.
6. Como **motorista**, quero que ao abrir contestação o incidente saia da rede imediatamente, para não seguir marcado durante a análise.
7. Como **locadora dona**, quero receber o pedido de contestação e responder em 15 dias úteis, para manter o controle do meu registro.
8. Como **superadmin (operador)**, quero intervir em contestação só se a locadora não responder no prazo, para não virar juiz cotidiano.
9. Como **superadmin**, quero que o sistema **impeça** minha conta de ler `motorista`/`incidente`/ficha/busca, para a prova ser arquitetural.
10. Como **superadmin**, quero acesso a gestão de locadoras e à fila de contestações, sem acesso a dados de motorista.
11. Como **operador**, quero `consulta_log` de toda abertura de ficha/busca, para provar quem consultou o quê e quando.
12. Como **locadora**, quero que meus anexos tenham SHA-256, para integridade de prova.
13. Como **locadora**, quero purge de `suspeita` não confirmada em 30 dias, com audit, para reduzir passivo de boato eterno.
14. Como **titular**, quero canal de pedido de informação/correção/eliminação encaminhado à controladora, para exercer direitos LGPD.
15. Como **dev/operador**, quero teste automatizado da regra de visibilidade (ADR 0001), para a defesa mostrar comportamento, não opinião.
16. Como **juiz/ANPD**, quero que o pacote de prova seja reproduzível em 48h (playbook), para a resposta técnica ser ordenada.

## Implementation Decisions

- **Papéis no banco:** `perfil.papel` continua `superadmin|dono`; nenhuma leitura de motorista/incidente para `superadmin` nas RPCs de negócio (falha explícita no banco).
- **Termos:** versão em arquivo/constante do produto (ex.: `TERMOS_V1`); checkbox no cadastro da locadora; RPC/audit grava `{locadora_id, perfil_id, versao_termo, aceite_em}`. Campo novo em `locadora` ou evento em `audit_log` — preferir evento audit + coluna de conveniência se necessário.
- **Contestação:** entidade `contestacao` (id, incidente_id, cpf_verificado, nome, email, descricao, aberto_em, prazo_locadora_em, estado: aberta|respondida|procedente|improcedente|recurso_superadmin, decido_por, decidido_em, motivo). Abertura exige CPF **e data de nascimento** que batam com `motorista`, com limite de tentativas; resposta só confirma existência de ficha, sem listar incidentes; abre um pedido por incidente `confirmado` (improcedente não reabre). Ao abrir: transição do incidente para `contestado` + audit + alerta à locadora dona.
- **Contestacao vs estado:** estado do `incidente` é a fonte de visibilidade; `contestacao` é o procedimento. Transições de estado seguem `dominio.ts` + RPC existente, com caminho dedicado para abertura pelo canal público.
- **Consulta:** tabela `consulta_log` (append-only, mesmo padrão de `audit_log`); gravada nas RPCs `buscar_motorista`/`abrir_ficha`/equivalentes de tela. Sem termo digitado, sem contagem de incidentes.
- **Anexo:** coluna `anexo.hash` (text, sha256 hex) preenchida no upload; audit inclui hash.
- **Purge:** função agendada (ou RPC administrativa segura) remove/anonimiza `incidente.estado='suspeita'` com `criado_em < now() - 30 days`; registra audit; **nunca** remove `confirmado`/`contestado`.
- **Aviso de cruzamento:** ao transicionar para `confirmado`+`alta` (ou ao visibilizar na rede), badge no detalhe + notificação in-app à locadora dona. E-mail fora do MVP.
- **Teste de visibilidade:** teste automatizado (SQL/RPC ou integração) que falha se `suspeita`, `contestado` ou `confirmado`+baixa/média aparecerem para locadora de outra origem; e se superadmin receber ficha.
- **Docs jurídicos** (`docs/juridico/*`, ADR 0004–0005) já escritos como rascunho; código **implementa** o que eles afirmam.
- **Não entra agora:** login do motorista, e-mail, contrato ICP-Brasil, exportação de UI, scoring.

## Testing Decisions

- Bom teste = comportamento externo (RPC/UI), não implementação interna.
- Prioridade: (1) teste da regra de visibilidade com **duas locadoras** + superadmin; (2) contestação: CPF errado não abre; CPF certo abre e incidente vai para `contestado` e some da rede; (3) superadmin: leitura de ficha falha; (4) consulta_log grava em busca/abertura; (5) purge só `suspeita`; (6) termo: aceite gera audit com versão; (7) hash de anexo presente após upload.
- Prior art: `src/lib/dominio.test.ts` (transições, `cruzaARede`); `src/lib/permissao.test.ts`; padrão de RPC + seed de `scripts/verificar-t04.ps1`.
- CI: `npm run lint`, `npm run typecheck`, `npm test` verdes para cada fatia.

## Out of Scope

- Portal de login do motorista
- E-mail de notificação/cruzamento
- Contrato assinado digital (ICP-Brasil/Gov.br)
- Painel de exportação para o usuário
- Papel `atendente`, frota, scoring de crédito
- Revisão jurídica final dos documentos (advogado)

## Further Notes

- Ordem de execução: specs/tickets → código por aresta de bloqueio → verificação com seed.
- Playbook (`docs/juridico/playbook-intimacao.md`) passa a apontar para as RPCs/tabelas novas quando existirem.
- Qualquer RPC nova de leitura deve declarar na revisão: **superadmin lê motorista/incidente?** Se sim, bloquear merge.
