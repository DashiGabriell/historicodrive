# 08: Contestação pública com verificação de CPF

**What to build:** Motorista digita CPF no formulário público; o sistema só responde “há ficha / não há ficha”; se houver, abre pedido de contestação e o incidente alvo vai para `contestado` (sai da rede) com audit e alerta à locadora dona.

**Blocked by:** 01 (entidade `contestacao`), 07 (alerta à locadora)

**Status:** conclu�do (migra��o aplicada; `verificar-defesa.ps1` verde)

- [ ] Rota/formulário público de contestação com verificação de CPF
- [ ] CPF inexistente → mensagem genérica, **sem** abrir pedido e **sem** listar incidentes
- [ ] CPF existente → formulário (nome, e-mail, descrição) e criação de `contestacao`
- [ ] Ao abrir: incidente alvo → `contestado` + audit + alerta à locadora dona
- [ ] Fora da rede imediatamente (regra ADR 0001)
- [ ] Prazo da locadora registrado (15 dias úteis)
- [ ] Teste: CPF errado não abre; CPF certo abre e some da rede para outra locadora
- [ ] `npm run typecheck`, `lint`, `test` verdes
