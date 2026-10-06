# 03: consulta_log em busca e abertura de ficha

**What to build:** Toda busca de motorista e toda abertura de ficha grava registro de consulta (quem, de qual locadora, qual motorista, quando) para provar controle de acesso em processo.

**Blocked by:** 01 (tabela `consulta_log`)

**Status:** pronto (parcial na migração do T01; validar no banco)

- [x] `buscar_motorista` grava `consulta_log` quando devolve resultado (CPF e nome)
- [x] `abrir_ficha` grava `consulta_log` ao abrir
- [x] Não grava termo digitado nem contagem de incidentes no log
- [ ] Teste em banco: linha com `locadora_id`/`perfil_id` corretos (`verificar-defesa.ps1`)
- [x] `npm run typecheck`, `lint`, `test` verdes
