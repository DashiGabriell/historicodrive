# 06: Purge de suspeita em 30 dias

**What to build:** `incidente` em `suspeita` que nunca foi confirmado é removido/anonimizado após 30 dias, com audit — `confirmado` e `contestado` nunca entram no purge.

**Blocked by:** 01

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] Função/RPC de purge: `estado = 'suspeita'` e `criado_em < now() - interval '30 days'`
- [ ] Soft-delete ou anonimização coerente com o schema (trilha preservada)
- [ ] Audit da exclusão/purge (quando, quantos, critério)
- [ ] `confirmado` e `contestado` intocados
- [ ] Teste: suspeita antiga sai; suspeita recente, confirmada e contestada permanecem
- [ ] Agendamento (cron/edge) ou execução documentada no playbook de operação
- [ ] `npm run typecheck`, `lint`, `test` verdes
