# Playbook — Intimação, ação judicial ou demanda de titular

**Versão:** 1.0 · **Data:** 2026-10-06 · **Público:** operador/desenvolvedor do Histórico  
**Referências:** ADR 0004 (papéis), ADR 0005 (LGPD), ADR 0001 (visibilidade), termos locadora v1, política de privacidade v1

> Este playbook é **operacional de defesa/prova**. **Não é orientação jurídica.** Em qualquer intimação, peça parecer a advogado nas primeiras horas.

---

## 0. Princípios (leia antes de qualquer coisa)

1. **Não admitir, não responder, não especular** fora do canal formal com advogado.
2. **Não destruir nada.** Preservação de prova tem prioridade sobre limpeza, deploys e “otimizações”.
3. **Não falar com o titular/reclamante** sem instrução do advogado (fora o canal oficial de contestação já existente no produto).
4. **Papéis:** locadora = controladora; dev = operador (ADR 0004). Não aceite publicamente ser “dono dos dados de motorista da rede”.
5. **Escala:** se houver risco de quebra de sigilo, vazamento ou determinação judicial de entrega de dados, **advogado + preservação agora**.

---

## 1. Primeiras 2 horas (checklist)

- [ ] Registrar **data/hora de recebimento** da intimação/demanda e **meio** (eletrônico, físico, ANPD, MPF, juízo).
- [ ] Guardar o documento original (PDF + mídia) em pasta **somente leitura** do caso.
- [ ] **Congelar deploys** e migrations que toquem em: `incidente`, `motorista`, `anexo`, `audit_log`, `consulta_log`, RPCs de leitura.
- [ ] Abrir branch/pasta de caso: `.scratch/casos/<AAAA-MM-DD>-<slug>/`.
- [ ] Acionar **advogado** com: tipo de pedido, partes, CPF se houver, prazo, cópia do documento.
- [ ] **Não** exportar planilha “de curiosidade”. Toda extração de dado é **comandada pelo advogado** e fica logada.

---

## 2. O que produzir em até 48h (pacote de prova)

Gere **só o que o pedido exigir**, sempre com advogado na linha. Base típica:

### 2.1 Papéis e produto

| Artefato | Onde está | Prova o quê |
| --- | --- | --- |
| ADR 0004 — papéis | `docs/adr/0004-postura-legal-papeis.md` | Dev = operador; locadora = controladora |
| ADR 0005 — LGPD | `docs/adr/0005-base-legal-lgpd.md` | Base legal, retenção, salvaguardas |
| ADR 0001 — visibilidade | `docs/adr/0001-rede-visibilidade.md` | `suspeita`/`contestado` não cruzam rede |
| Termos da locadora | `docs/juridico/termos-locadora-v1.md` + aceite em audit | Responsabilidade da locadora |
| Política de privacidade | `docs/juridico/politica-privacidade-v1.md` | Informação ao titular |

### 2.2 Dados do caso (extração controlada)

Para o **CPF/motorista** envolvido, se o juízo/advogado autorizar:

1. `motorista` — só campos necessários (id, cpf, nome, nascimento, criado_em).
2. `incidente` — todos os campos + `locadora_id` dona + `estado` + `confianca` + timestamps.
3. `audit_log` do(s) incidente(s) — **append-only**: ações, atores, antes/depois.
4. `consulta_log` do(s) motorista(s) — **quem abriu a ficha e quando** (Q17=A).
5. `anexo` — caminho, content_type, bytes, **hash SHA-256**, criado_em.
6. Histórico de **contestação** (quando existir a feature): abertura, prazo, decisão, quem decidiu.
7. Configuração da locadora dona: `status`, `receber_da_rede`, timestamps de aprovação.
8. Versão do termo aceito + timestamp do aceite (audit).

### 2.3 Provas “negativas” (arquitetura)

Quando a alegação for **“a plataforma é lista negra / o dev espionava”**:

- [ ] ADR 0001: invariante **buscável ≠ listável**.
- [ ] RPC de leitura: `superadmin` **não** recebe motorista/incidente (ADR 0004 / Q16).
- [ ] Teste automatizado da regra de visibilidade (quando existir) — evidência de CI.
- [ ] Política de anexo privado (storage + RLS da pasta da locadora).
- [ ] Política de contestação: como o titular abre e o que sai da rede.

### 2.4 O que **nunca** produzir sem ordem/advogado

- Base completa de motoristas da rede “para entender o caso”.
- Anexos de locadoras **não** partes, se não forem objeto do pedido.
- Credenciais, `.env`, chaves de serviço.
- Screenshots soltos sem contexto de sistema/versão/data.

---

## 3. Mapa de comandos/provas (a partir da feature de prova)

Assim que as mudanças da fase 1 estiverem no repositório, o pacote 48h deve ser **reproduzível**. Pré-requisitos de código (tickets):

1. `consulta_log` + gravação em abertura de ficha/busca.
2. Bloqueio técnico de `superadmin` nas RPCs de leitura.
3. Aceite de termos (versão + audit).
4. Hash SHA-256 de anexo no upload.
5. Fluxo de contestação com verificação de CPF e transição para `contestado`.
6. Purge de `suspeita` > 30 dias com audit.
7. Badge/alerta de cruzamento na rede.
8. Teste automatizado da regra de visibilidade.

Até lá, o pacote usa **audit_log + documentação + extrair via SQL de leitura controlada pelo advogado** (papel `superadmin` não deve ser usado para “furar” o bloqueio).

---

## 4. Matriz de resposta rápida (uso interno)

| Situação | Primeiro passo | Provas-chave | Risco se errar |
| --- | --- | --- | --- |
| Motorista ajuíza dano moral por “lista negra” | Advogado + preservar | ADR 0001/0004/0005, audit, contestação, termos da locadora autora | Admitir controle editorial do conteúdo |
| ANPD/petição sobre LGPD | Advogado + DPO (quando nomeado) | ADR 0005, política, bases, prazos de resposta | Prazo perdido, falta de base legal |
| Locadora pede “apagar tudo” | Encaminhar à controladora; advogado se houver ordem | Papéis ADR 0004, retenção ADR 0005 | Apagar prova ou violar ordem |
| Vazamento/acesso indevido | Mitigar + advogado + preservar logs | `consulta_log`, audit, RPC, RLS | Apagar log; “limpar” sistema |
| Pedido de dados em juízo | Só com ofício/advogado | Extração mínima + cadeia de custódia | Extração ampla sem ordem |

---

## 5. Cadeia de custódia (mínimo)

- Pasta do caso: original, extrações, comunicações, versão do app/commit.
- Toda extração anotada: **quem pediu, quem executou, quando, quais tabelas, finalidade**.
- Hash dos arquivos exportados (SHA-256) e cópia somente leitura.
- Nada de edição de `audit_log`/`consulta_log` — se o sistema está certo, o log está certo.

---

## 6. Comunicação (template — só advogado envia)

> Recebemos a demanda em [data]. Os dados sob tratamento são operados pela plataforma Histórico na qualidade de **operador**, a pedido das **locadoras controladoras**. Qualquer informação adicional será prestada pelos canais formais, com preservação das provas e dos direitos dos titulares, mediante instrução judicial/conselho profissional aplicável.

**Não usar** em público: “nós somos a rede inteira”, “o motorista está listado nacionalmente”, “a locadora inventou” etc.

---

## 7. Pós-evento (retro)

- [ ] O que faltou de prova? vira ticket.
- [ ] Docs jurídicos atualizados?
- [ ] RPCs/testes de visibilidade reforçados?
- [ ] Contas e acessos revisados (quem pode ler quê)?
- [ ] Playbook v1.1 com o que aprendeu.

---

## 8. Contatos (preencher em produção)

| Papel | Nome | Contato | Quando acionar |
| --- | --- | --- | --- |
| Advogado(a) | | | Sempre, nas primeiras horas |
| Desenvolvedor/operador | | | Preservação, extração técnica, deploy freeze |
| Encarregado/DPO (LGPD) | | | Demandas de titular/ANPD (quando nomeado) |
