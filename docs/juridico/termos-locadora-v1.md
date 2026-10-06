# Termos de Uso da Plataforma Histórico — Locadora

**Versão:** 1.0 (rascunho) · **Data:** 2026-10-06 · **Status:** rascunho para revisão de advogado

> **Aviso:** documento-engineering/rascunho contratual alinhado às ADR 0004 e 0005. **Não é contrato assinado.** Substituir pela versão jurídica antes de produção.

---

## 1. Objeto

Estes termos regem o uso da plataforma **Histórico** (“plataforma”) pela **locadora** (“você”), incluindo cadastro, registro de motoristas e incidentes, consulta no balcão e participação na rede de locadoras.

## 2. Papéis e responsabilidade pelo conteúdo

1. Você é **controladora** dos dados pessoais que coleta e dos incidentes que registra na plataforma.
2. O desenvolvedor da Histórico é **operador** da plataforma: processa dados conforme suas instruções e conforme o contrato de uso.
3. **Você é responsável** pela veracidade, legalidade e base dos dados e incidentes que cadastrar, inclusive anexos, descrições e valores.
4. Você declara que coleta e usa os dados de motorista de forma compatível com a LGPD e com a relação contratual de locação (quando houver).

## 3. Estados e visibilidade

1. Um incidente nasce em **`suspeita`** e é visível **somente para você**.
2. Em **`confirmado` com confiança `alta`**, o incidente pode ficar visível para **outras locadoras aprovadas** que aceitem receber da rede.
3. **`suspeita`**, **`contestado`** e **`confirmado` com confiança `baixa` ou `média`** **não** cruzam a rede.
4. A plataforma **não** lista nem enumera motoristas: a busca exige CPF ou nome completo, com confirmação em dois passos.
5. **Anexos** (fotos e arquivos) ficam **privados** da sua locadora e **não** são compartilhados na rede.
6. Você pode desligar o recebimento da rede (`receber_da_rede`); isso **não** remove da rede os incidentes `confirmado`+`alta` que **você** registrou, salvo contestação procedente.

## 4. Contestação de motorista

1. O motorista (titular) pode abrir **contestação** pelo formulário público, mediante **verificação de CPF**.
2. Ao abrir a contestação, o incidente alvo transiciona para **`contestado`** e **sai da rede** enquanto durar o procedimento.
3. A contestação é encaminhada à **locadora dona** do incidente, que deve responder em até **15 dias úteis**.
4. Se você não responder no prazo, o operador da plataforma pode decidir como recurso, com registro em auditoria.
5. Contestações procedentes mantêm o incidente em `contestado` (fora da rede). Se você mantiver/reativar `confirmado`+`alta`, o incidente volta a cruzar a rede, com novo audit.

## 5. Auditoria e integridade

1. A plataforma grava **auditoria append-only** de criação, edição e transição de incidentes (quem, quando, antes/depois).
2. Toda abertura de ficha ou busca gera **registro de consulta** (usuário, locadora, motorista, horário).
3. Anexos recebem **hash SHA-256** no envio, para checagem de integridade.
4. Você pode consultar a auditoria dos **seus** registros pela interface prevista.

## 6. Aceite

1. Ao concluir o cadastro da locadora, você **aceita** estes termos em sua versão vigente.
2. O aceite fica registrado na plataforma com **versão do termo**, identificação do usuário e data/hora.
3. Alterações relevantes serão comunicadas; o uso continuado após a vigência da nova versão implica aceite, salvo disposição em contrário na versão jurídica final.

## 7. Encerramento

1. Você pode solicitar o encerramento do uso; dados sob sua controladoria seguem a política de retenção e as instruções de eliminação/encerramento aplicáveis.
2. Registros de auditoria e de consulta podem ser mantidos pelo prazo de prova/obrigações legais da operação.

## 8. Disposições finais

1. Estes termos são regidos pelas leis brasileiras.
2. Foros e demais cláusulas contratuais (arbitragem, eleição de foro, responsabilidade civil, indenizações, confidencialidade) **devem ser completados pelo advogado** antes de qualquer assinatura ou publicação vinculante.
3. Se alguma cláusula for tida por inválida, as demais permanecem.

---

**Checklist pós-advogado (não publicar sem):** foro exclusivo · limitação de responsabilidade do operador · indenização da locadora ao operador por dado indevido · confidencialidade · força maior · contato do encarregado/DPO · versão datada e método de notificação de alterações.
