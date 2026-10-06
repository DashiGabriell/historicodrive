# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Dono de locadora de veículos pequena** (papel `dono`): é ele — ou quem atende por ele — que está no balcão com o cliente à frente e precisa decidir se aluga. Trabalha no celular ou no computador da loja, com conexão ruim às vezes.

**Superadmin** (o operador da plataforma): aprova locadoras na rede. Não é usuário da landing; aparece aqui só para delimitar o escopo do MVP.

## Product Purpose

Registrar e consultar o histórico de incidentes de motoristas entre locadoras. O produto existe para responder, em menos de 5 segundos, a pergunta de balcão: _"esse motorista já gerou prejuízo para alguém?"_.

Sucesso = o balcão responde a pergunta antes do cliente perder a paciência, com o registro anterior à mão e sem planilha paralela.

## Positioning

O mecanismo que um vizinho não copia sem copiar a regra inteira: **a rede é buscável, nunca listável** (ADR 0001). Nenhuma tela, endpoint ou query devolve motoristas, incidentes ou "recentes" sem o usuário ter digitado um CPF ou um nome completo exato. Complementos do mesmo invariante:

- `suspeita` é privada da locadora que criou; só `confirmado` + `confiança = alta` cruza a rede.
- CPF é identidade única da ficha de motorista; busca por nome só nomeia, nunca confirma (ADR 0002).
- Anexo (máx. 6 por incidente) é prova interna e **nunca sai** da locadora dona.

## Operating Context

- Balcão de locadora, em pt-BR, ritmo de atendimento presencial.
- PWA instalável, com banner de offline e rascunho de incidente que sobrevive a reload/queda de conexão.
- Cadastro de locadora passa por aprovação do superadmin antes de a rede valer.
- Sem ORM: o acesso de negócio inteiro é RPC `SECURITY DEFINER` no Supabase (ADR 0003); RLS em tudo, privilégios de tabela revogados.

## Capabilities and Constraints

- Busca de motorista por CPF (exato) ou nome completo (exato), com confirmação em dois passos.
- Incidente com ciclo `suspeita → confirmado → contestado` e confiança `baixa | media | alta` independentes; nada se apaga, só transiciona.
- Ficha do motorista global por CPF, com incidentes e anexos (até 6).
- Painel de KPIs apenas da própria locadora; trilha de auditoria append-only (quem, o quê, quando, antes/depois).
- Fila de aprovação do superadmin; ajustes da locadora, inclusive o interruptor `receber_da_rede`.
- Restrições firmes: sem exportação CSV/PDF, sem tela que liste dados alheios, sem papel `atendente` no MVP, veículo é campo de placa (não entidade).
- Termos de domínio são os de `docs/GLOSSARY.md`, que manda sobre o código (nunca: "ocorrência", "sinistro", "cliente" para motorista, "feed" para rede).
- **Para a landing:** o usuário determinou que ela fala **só do produto** — sem preço, sem número de clientes, cidade, tempo de operação ou testemunho. Nada disso existe em mãos e não pode ser inventado.

## Brand Commitments

- Nome público: **Histórico** (o `<title>`/OG do `index.html` ainda escreve "HistóricoDrive"; divergência conhecida — o nome aprovado vale).
- Idioma e vocabulário: pt-BR, regido pelo glossário do projeto.
- Ativos: `public/logo.png`, `public/logo-2.png`, ícones PWA em `public/icons/` (192/512/maskable/apple-touch), `public/favicon.ico`.

## Evidence on Hand

Não há testemunhos, cases, logos de clientes, números de uso nem imprensa. A única prova disponível é a do próprio produto: regras documentadas nos ADRs (`docs/adr/0001..0003`), o glossário, o styleguide público em `/styleguide` e as telas em execução. Qualquer afirmação de mercado futura precisa ser fornecida pelo usuário antes de aparecer.

## Product Principles

1. **Balcão primeiro:** se não cabe no ritmo de um atendimento, não entra.
2. **Dado registrado é buscável, nunca listável** — a rede não é um feed.
3. **CPF é identidade; nome é só uma pista.**
4. **Prova fica em casa:** anexo e `suspeita` nunca cruzam a fronteira da locadora.
5. **A máquina mostra, o humano decide:** o balcão lista o que sabe; quem aluga é a locadora.
