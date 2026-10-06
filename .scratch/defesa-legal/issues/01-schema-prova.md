# 01: Schema de prova — contestação, consulta_log, hash de anexo e termos

**What to build:** O banco passa a carregar a espinha da defesa: entidade de `contestacao`, tabela `consulta_log` append-only, coluna de hash no `anexo` e registro de aceite de termos da locadora — tudo no mesmo padrão de `audit_log` (sem update/delete onde a prova exige imutabilidade).

**Blocked by:** None (can start immediately)

**Status:** conclu�do (`verificar-defesa.ps1` verde)

- [x] Tabela `contestacao` com campos de abertura (incidente, identificação do titular, descrição), prazo da locadora, estado do procedimento e decisão (quando/quem/motivo)
- [x] Tabela `consulta_log` append-only: `perfil_id`, `locadora_id`, `motorista_id`, `criado_em` (sem termo digitado, sem contagem de incidentes)
- [x] Coluna `anexo.hash` (sha256 hex) + preenchimento obrigatório no fluxo de upload
- [x] Aceite de termos: colunas `termos_versao`/`termos_aceite_em`/`termos_aceite_por` em `locadora` (audit no T05)
- [x] RLS/RPC no mesmo padrão do projeto (sem select comum)
- [ ] Seed/verificação mínima: rodar `aplicar-migrations.ps1` + `verificar-defesa.ps1` no Supabase real
- [x] `npm run typecheck`, `lint`, `test` verdes (46 testes)
