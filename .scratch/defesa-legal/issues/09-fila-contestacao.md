# 09: Fila de contestação — locadora dona decide; superadmin é recurso

**What to build:** Locadora dona vê e responde contestações dos seus incidentes em até 15 dias úteis. Se não responder, `superadmin` decide como recurso (sem ler ficha de motorista além do que a fila de contestação exige para decidir o procedimento — preferir metadados do pedido, não a ficha completa).

**Blocked by:** 08 (contestação aberta)

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] Tela/fila de contestações da locadora dona (só as suas)
- [ ] Decisão: procedente / improcedente + motivo; audit
- [ ] Transição de estado do incidente coerente (`contestado` ↔ `confirmado`)
- [ ] Após 15 dias úteis sem resposta, contestação entra na fila do superadmin
- [ ] Superadmin decide o recurso com audit (quem, quando, motivo)
- [ ] Procedente mantém `contestado` (fora da rede)
- [ ] Teste: locadora responde no prazo; prazo vencido cai no superadmin; decisões geram audit
- [ ] `npm run typecheck`, `lint`, `test` verdes
