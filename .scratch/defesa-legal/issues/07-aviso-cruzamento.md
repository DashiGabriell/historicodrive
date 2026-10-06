# 07: Aviso de cruzamento na rede (badge + alerta in-app)

**What to build:** Quando um incidente fica `confirmado`+`confiança alta` e passa a ser visível na rede, a locadora dona vê badge no incidente e recebe alerta in-app. E-mail fica para depois.

**Blocked by:** 01 (base de notificação/alerta)

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] Badge no detalhe do incidente: “visível na rede desde …” quando a regra ADR 0001 aplica
- [ ] Alerta in-app à locadora dona na transição que cruza a rede
- [ ] Audit da notificação/aviso
- [ ] `contestado`/`suspeita`/confiança baixa-média **não** geram badge de cruzamento
- [ ] Teste: só `confirmado`+`alta` mostra badge e alerta
- [ ] `npm run typecheck`, `lint`, `test` verdes
