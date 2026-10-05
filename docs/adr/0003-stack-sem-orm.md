# ADR 0003 — Supabase sem ORM, leitura via RPC `security definer`

**Status:** aceito · **Data:** 2026-10-05 · **Decisões de apoio:** Q7, Q26, Q27(c)

## Contexto

A [ADR 0001](0001-rede-visibilidade.md) descreve uma regra de visibilidade com **três camadas** que depende de: papel do usuário, locadora de origem do registro, `estado`, `confiança` e o toggle `receber_da_rede` da locadora **que está perguntando**. Um RLS clássico com policies `select` não exprime isso limpo — e um policy errado não falha, **vaza**.

Ao mesmo tempo, o projeto já é multi-tenant por natureza e vai rodar num único deploy pequeno.

## Decisão

1. **Sem ORM.** Acesso ao banco via `@supabase/supabase-js` direto. Sem Prisma, sem Drizzle, sem camada de repositório genérica.
2. **Escrita** (`insert`/`update` de `locadora`, `motorista`, `incidente`, `anexo`, `auditoria`) passa por **Server Actions** que usam o cliente com a sessão do usuário, protegidas por RLS por `locadora`.
3. **Leitura** de `motorista` e `incidente` acontece **exclusivamente** por funções Postgres `SECURITY DEFINER` (RPC):
   - `buscar_motorista(termo)` — aceita CPF ou nome completo; aplica a regra anti-marketplace; **nunca** retorna lista sem termo.
   - `abrir_ficha(motorista_id)` — devolve a ficha + incidentes **visíveis para a locadora atual**.
   - `painel_kpis(periodo)` — agregados **apenas** da locadora atual.
4. Toda RPC valida `auth.uid()` e resolve a locadora do chamador **dentro** da função. Nenhum parâmetro de locadora vem do cliente.
5. `audit_log` é **append-only**: sem `update`/`delete` para ninguém (nem `superadmin`), gravado por trigger nas mutações de `incidente`.

## Consequências

- **RLS continua ligado em tudo.** RPC `definer` é o caminho de leitura, não uma brecha: ela _é_ o policy engine. A política de defesa é testada manualmente com **duas contas reais de locadoras diferentes** antes de cada deploy (Q27).
- Sem camada de modelo compartilhada: os tipos TypeScript viram do **gerados pelo Supabase** (ou de um único `src/db/tipos.ts` espelho do schema). O schema é a fonte de verdade.
- Trocar por Prisma/Drizzle depois é viável — nenhum código de domínio depende do cliente além de `src/lib/*`.
- O custo de "escrever SQL à mão" é pago uma vez, no schema; o ganho é que a regra de visibilidade existe **em um lugar só**, em SQL auditável.

## Alternativas consideradas

- **(A) Drizzle** — tipos ótimos, mas a regra de visibilidade ainda precisaria de função SQL; dois lugares onde a verdade mora.
- **(B) Prisma** — peso de engine binário e mais uma abstração sobre um banco que já tem abstração.
- **(C) Tudo em RLS com policies `select`** — a regra de três camadas vira policies aninhadas com `exists (select ...)` quase impossíveis de revisar; e o pior falha em silêncio.
- **(D) Lógica de visibilidade em TypeScript na API** — funciona, mas qualquer outro caminho de leitura (painel SQL, migração, script) ignora a regra.
