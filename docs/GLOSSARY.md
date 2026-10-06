# GLOSSARY — Histórico

Língua compartilhada do projeto. Quando este documento e o código divergirem, **este documento manda** e o código é corrigido.

**Convenção**: termo de domínio em **pt-BR** (telas, mensagens, diálogos), identificador em **inglês** (coluna SQL `snake_case`, tipo/variável TS `camelCase`). Nada de acento, espaço ou plural inventado em identificador.

| Termo (pt-BR)  | Nunca diga                                    | Identificador               | Definição (uma linha)                                                                                                  |
| -------------- | --------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **locadora**   | empresa, filial, cliente, garagem             | `locadora` / `locadoraId`   | Unidade de negócio que aluga veículos; dona dos registros que criou e é o **tenant** de tudo.                          |
| **motorista**  | cliente, usuário, condutor, pessoa            | `motorista` / `motoristaId` | Quem conduz o veículo; ficha **global** única identificada pelo **CPF**, existe mesmo sem incidente.                   |
| **incidente**  | ocorrência, caso, problema, passivo, sinistro | `incidente` / `incidenteId` | Registro de um fato atribuído a um motorista que gerou ou poderia gerar prejuízo; pertence a **uma** locadora.         |
| **estado**     | status, fase, situação, etapa                 | `estado`                    | Ciclo de vida do incidente: `suspeita → confirmado → contestado`. Nunca se apaga, só transiciona.                      |
| **confiança**  | risco, nível, prioridade, gravidade           | `confianca`                 | Grau de certeza de quem registrou: `baixa \| media \| alta`. Independente do `estado`.                                 |
| **rede**       | plataforma, comunidade, mercado, feed         | `rede`                      | Conjunto das locadoras aprovadas que trocam `incidente` em `confirmado`; **não** é um lugar onde se navega.            |
| **anexo**      | foto, arquivo, mídia, evidência, upload       | `anexo` / `anexoId`         | Arquivo ligado a um incidente (máx. 6); prova **interna** da locadora dona, **nunca** sai dela.                        |
| **auditoria**  | log, histórico, trilha, activity              | `auditoria` / `auditLog`    | Registro append-only de quem fez o quê, quando e o que mudou (antes/depois). Fonte de verdade do "eu não fiz isso".    |
| **dono**       | admin, gerente, operador, atendente           | `dono`                      | Papel que pertence a **uma ou mais** locadoras: cria, edita e transiciona incidentes. Único papel de aplicação no MVP. |
| **superadmin** | admin, root, suporte, moderador               | `superadmin`                | Papel global seu (o dev): aprova locadoras, decide contestação como recurso. **Nunca** lê `motorista`/`incidente` (ADR 0004). |
| **controladora** | dona dos dados, responsável LGPD           | `controladora`              | Quem decide finalidade e meios do dado de motorista: **a locadora** que registra/recebe. Ver [`adr/0004`](adr/0004-postura-legal-papeis.md). |
| **operador**   | dev, plataforma, fornecedor                   | `operador`                  | Quem processa o dado na ferramenta sem decidir finalidade: **o dev do Histórico**. Ver [`adr/0004`](adr/0004-postura-legal-papeis.md). |
| **titular**    | pessoa, cliente, condutor, motorista (LGPD)   | `titular`                   | Dono dos dados pessoais tratados: o **motorista**. Pode contestar e exercer direitos LGPD. |
| **contestacao** | defesa, recurso, revisão, queixa             | `contestacao` / `contestacaoId` | Pedido do titular (via CPF verificado) para revisar um incidente; abre com transição do incidente para `contestado`. |
| **purge**      | limpeza, exclusão, delete, anonimização       | `purge`                     | Remoção/anonimização controlada de `suspeita` não confirmada após **30 dias**, sempre com audit. Ver [`adr/0005`](adr/0005-base-legal-lgpd.md). |
| **consulta_log** | log de acesso, tracking, visita              | `consultaLog`               | Registro append-only de **quem abriu** ficha/busca (perfil, locadora, motorista, horário). Prova de controle de acesso. |

## Regras que o glossário carrega

- **Rede é buscável, não listável.** Não existe tela, endpoint ou query que devolva motoristas, incidentes ou "recentes" sem que o usuário tenha digitado um **CPF** ou um **nome completo exato**. Ver [`adr/0001`](adr/0001-rede-visibilidade.md).
- **`suspeita` é privada.** Só a locadora que criou vê. `confirmado` com `confianca = alta` é o único que cruza a rede. Ver [`adr/0001`](adr/0001-rede-visibilidade.md).
- **CPF é identidade.** Toda ficha de motorista tem CPF; busca por nome só nomeia, nunca confirma. Ver [`adr/0002`](adr/0002-identidade-por-cpf.md).
- **Sem ORM.** Leitura de `motorista` e `incidente` acontece **só** via RPC `security definer`. Ver [`adr/0003`](adr/0003-stack-sem-orm.md).
- **Papéis LGPD.** Locadora = controladora; dev = operador; motorista = titular. `superadmin` não lê ficha/incidente. Ver [`adr/0004`](adr/0004-postura-legal-papeis.md).
- **Contestação tira da rede.** Abrir contestação move o incidente para `contestado` (fora da rede); locadora dona responde em 15 dias úteis; superadmin é recurso. Ver [`adr/0004`](adr/0004-postura-legal-papeis.md).
- **Retenção.** `suspeita` purge em 30 dias; `confirmado` retenção indefinida justificada. Ver [`adr/0005`](adr/0005-base-legal-lgpd.md).

## O que ficou de fora (e por quê)

- **papel `atendente`** — adiado; o MVP tem só `dono` e `superadmin`.
- **regra automática de alerta** — o balcão mostra a lista crua; quem decide é a locadora. **Exceto** alerta de cruzamento da rede (badge + in-app), que é prova/aviso ao controlador.
- **frota** — veículo é um **campo de placa** com validação de formato, não uma entidade.
- **exportação** — o painel é visual; nenhum CSV/PDF **para o usuário**. Extração para processo/playbook é operação controlada do operador, não feature de UI.
- **portal do motorista com login** — adiado; MVP tem só contestação pública com verificação de CPF.
- **e-mail de notificação** — adiado; MVP usa badge + alerta in-app.
- **contrato assinado ICP-Brasil** — fora do MVP; termos hoje são aceite em cadastro + audit.
