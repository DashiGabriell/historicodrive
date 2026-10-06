# 10: Teste automatizado da regra de visibilidade (ADR 0001 + superadmin)

**What to build:** CI prova que a rede não vaza: `suspeita`, `contestado` e `confirmado`+confiança baixa/média não retornam para locadora de outra origem; `confirmado`+`alta` só para quem tem `receber_da_rede`; superadmin nunca recebe ficha/incidente.

**Blocked by:** 02 (bloqueio superadmin), 06 (purge coerente com estados), 08 (contestado via canal público)

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] Teste com **duas locadoras** aprovadas (padrão do seed/verificar-t04)
- [ ] Assert: locadora B não vê `suspeita`/`contestado`/`confirmado` baixa-média da locadora A
- [ ] Assert: locadora B vê `confirmado`+`alta` da A só se `receber_da_rede` da B for true
- [ ] Assert: superadmin não recebe resultado de `abrir_ficha`/busca de motorista
- [ ] Assert: anexo da A não aparece para B
- [ ] Roda em `npm test` (vitest) ou script de verificação documentado
- [ ] `npm run typecheck`, `lint`, `test` verdes
