# 02: Bloqueio técnico do superadmin em leitura de motorista/incidente

**What to build:** `superadmin` deixa de conseguir ler ficha, busca ou incidente **no banco** — falha explícita nas RPCs de leitura, não “só não tem UI”. Gestão de locadoras e fila de contestação continuam possíveis.

**Blocked by:** None (can start immediately)

**Status:** conclu�do (`verificar-defesa.ps1` verde)

- [x] RPCs `buscar_motorista` e `abrir_ficha` rejeitam `papel = 'superadmin'` com erro claro (`exigir_leitura_titular`)
- [x] `detalhe_incidente`/`painel_kpis`/`listar_incidentes` já exigiam `dono`
- [x] `superadmin` ainda aprova/recusa locadoras (`listar_pendentes`)
- [ ] Teste em banco: conta superadmin **não** abre ficha/busca (no `verificar-defesa.ps1`)
- [x] `npm run typecheck`, `lint`, `test` verdes
