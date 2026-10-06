# Projeto Vite + React

- Stack: **Vite**, React 19, TypeScript, `react-router-dom`, Tailwind 4, Vitest, ESLint flat.
- `npm run dev` sobe o Vite; `npm run build` gera `dist/` (é o que a Vercel executa).
- Rotas ficam em `src/App.tsx`; as telas ficam em `src/pages/`.
- Env do browser precisa do prefixo `VITE_` (`.env`); cliente Supabase em
  `src/lib/supabase.ts`. Sessão/perfil em `src/lib/sessao.tsx` + `sessao-contexto.ts`
  (`useSessao`); portão de rota em `src/lib/rota-protegida.tsx`, com a regra pura
  em `src/lib/permissao.ts`.
- Não existe `export const metadata`: cada tela declara o título com
  `useTitulo()` de `src/lib/use-titulo.ts`.
- Visual: `src/styles/globals.css` importa `docs/estilo/tokens.css` e depois
  `docs/estilo/tokens-3d.css`, ambas em `layer(components)` — a ordem importa
  (a variante plástica vence). Tailwind é usado **só para layout**.
- Banco: `supabase/migrations/` aplicados por `scripts/aplicar-migrations.ps1`;
  seed em `scripts/seed.ps1`; checagens de regra em `scripts/verificar-t04.ps1`
  e da defesa legal em `scripts/verificar-defesa.ps1` (alteram dados: rode o
  seed antes de repetir).
- Todo acesso ao banco é por RPC `SECURITY DEFINER` (ver `docs/adr/0003-stack-sem-orm.md`).
 Nenhuma leitura direta de tabela pelo cliente. Função nova nasce executável por
 `PUBLIC`: toda migration fecha com `revoke execute ... from public, anon, authenticated`
 e grant explícito só das RPCs de tela (`verificar-defesa.ps1` confere a superfície).
- Retenção roda no `pg_cron` (`hd-retencao-diaria`, `hd-descarte-anexos`); arquivos
 só saem pela Storage API com a chave guardada no Vault por `scripts/configurar-descarte.ps1`.
- Defesa legal / prova: ADR 0004–0005, `docs/juridico/` (rascunhos p/ advogado) e
  spec em `docs/spec-defesa-legal.md`. Tickets em `.scratch/defesa-legal/issues/`.
  Nova RPC de leitura **não** pode devolver `motorista`/`incidente` para `superadmin`.
  Fluxos públicos (sem login): `/termos`, `/contestar` (contestação por CPF +
 data de nascimento, com limite de tentativas).
