# 05: Aceite de Termos da Locadora no cadastro

**What to build:** Ao se cadastrar, a locadora precisa aceitar os Termos v1; o aceite fica provado com versão do termo, usuário e data/hora.

**Blocked by:** 01 (registro de aceite)

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] UI de cadastro da locadora com aceite obrigatório dos Termos (link para o texto)
- [ ] Sem aceite, cadastro não conclui
- [ ] RPC/audit grava versão do termo + `perfil_id` + `locadora_id` + timestamp
- [ ] Texto dos Termos v1 versionado no produto (`docs/juridico/termos-locadora-v1.md` como fonte, constante/versão no app)
- [ ] Teste: cadastro sem checkbox falha; com checkbox gera registro de aceite
- [ ] `npm run typecheck`, `lint`, `test` verdes
