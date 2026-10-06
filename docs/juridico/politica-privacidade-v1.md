# Política de Privacidade — Plataforma Histórico

**Versão:** 1.0 (rascunho) · **Data:** 2026-10-06 · **Status:** rascunho para revisão de advogado

> **Aviso:** alinhada às ADR 0004 e 0005. **Não substitui parecer jurídico** nem o dever de informar titulares conforme a LGPD interpretada pelo seu advogado.

---

## 1. Quem somos e papéis

- **Histórico** é plataforma interna de rede de locadoras para registrar e consultar histórico de incidentes de motoristas.
- **Locadora** (usuária do sistema que cadastra e confirma incidentes) = **controladora** dos dados que coleta.
- **Desenvolvedor/operador da Histórico** = **operador**, que processa dados conforme instruções da locadora e para operar a plataforma.
- **Motorista** = **titular** dos dados pessoais tratados (CPF, nome, foto, nascimento, incidentes).

## 2. Dados que tratamos

| Dado | Origem | Quando |
| --- | --- | --- |
| Nome completo, CPF, data de nascimento, foto | Locadora no balcão / cadastro de motorista | Criação e conferência da ficha |
| Placa, tipo de incidente, descrição, valor, estado, confiança | Locadora | Registro e atualização de incidente |
| Anexos (imagens/arquivos) | Locadora | Evidência interna do incidente (máx. 6) |
| Dados de conta (e-mail, senha, perfil, papel) | Locadora / operador | Cadastro e autenticação |
| Trilha de auditoria e de consulta | Plataforma | Toda mutação relevante e toda abertura de ficha/busca |

## 3. Finalidades

1. Operar o cadastro, a busca no balcão e a gestão de incidentes pela locadora.
2. Permitir que locadoras aprovadas **recebam**, se optarem, incidentes em `confirmado`+`confiança alta` de outras locadoras.
3. Garantir integridade, rastreabilidade e defesa em eventual disputa ou processo.
4. Atender direitos do titular (contestação, informação, correção, eliminação quando aplicável).

## 4. Compartilhamento na rede

1. **Não** há listagem pública de motoristas. A plataforma é **buscável** (CPF ou nome completo), nunca **listável**.
2. `suspeita`, `contestado` e `confirmado` com confiança baixa/média **não** são compartilhados na rede.
3. `confirmado`+`alta` pode ser visível para locadoras aprovadas com `receber_da_rede` ligado.
4. **Anexos não** são compartilhados entre locadoras.
5. Ao abrir contestação, o incidente deixa a rede até a decisão.

## 5. Bases legais (resumo — ver ADR 0005)

- Coleta/registro e consulta na locadora: **legítimo interesse** e/ou **exercício regular de direito** em contrato de locação, documentado pela controladora.
- Compartilhamento na rede: **legítimo interesse** das locadoras receptoras, com salvaguardas (visibilidade restrita, opt-out, contestação).
- Operação da plataforma: execução de contrato / instrução da controladora.
- Onde aplicável, direitos do titular serão atendidos via canal do operador encaminhando à controladora.

## 6. Retenção (resumo — ver ADR 0005)

- `suspeita` não confirmada: **purge automático em 30 dias**.
- `confirmado`/`contestado`: **purge automático em 5 anos** contados do registro, com anexos e contestações.
- Ficha de motorista sem incidente: apagada.
- Auditoria e consultas: mantidas pelo prazo operacional de prova, minimizadas no expurgo (sem placa, descrição nem identificação do motorista).
- Solicitações de eliminação: avaliadas com a controladora (locadora dona), ressalvadas obrigações legais de guarda.

## 7. Direitos do titular (motorista)

Nos termos da LGPD e da versão jurídica final:

1. **Contestar** incidentes pelo canal público com verificação de CPF e data de nascimento (tentativas limitadas).
2. Solicitar **informação** sobre tratamento de seus dados.
3. Solicitar **correção** de dados incompletos/incorretos junto à locadora dona do registro.
4. Solicitar **eliminação** quando cabível, com registro e sem prejuízo de retenção legal/legítima.
5. Contato: canal publicado no rodapé do app e na tela de contestação (e-mail do operador — a definir em produção).

## 8. Segurança

- RLS ligado em todas as tabelas; leitura de motorista/incidente via funções `SECURITY DEFINER` com regra de visibilidade.
- Storage de anexos privado, por pasta da locadora.
- Logs de auditoria e de consulta **append-only**.
- `superadmin` **sem** acesso de leitura a dados de motorista/incidente.
- Hash SHA-256 em anexos para integridade.
- Contas de teste e segredos nunca versionados; `.env` fora do repositório.

## 9. Cookies e armazenamento local

- Autenticação e sessão usam cookies/`localStorage` do Supabase Auth, necessários ao funcionamento.
- O rascunho de incidente fica em `sessionStorage` (some ao fechar a aba) e é apagado no logout.
- Sem cookies de publicidade.

## 10. Alterações

Versões desta política ficam datadas. Alterações relevantes serão anunciadas no app antes da vigência, conforme o método na versão jurídica final.

---

**Checklist pós-advogado:** dados de contato do encarregado (DPO) · base legal detalhada por fluxo · hipóteses de transferência internacional (Supabase/Vercel) · modelo de resposta a titular · prazos legais de atendimento · publicação efetiva no app (rota `/privacidade`).
