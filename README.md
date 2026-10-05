# HistóricoDrive

Plataforma interna para **registrar e consultar o histórico de incidentes de motoristas** em locadoras de veículos pequenas. O produto responde a uma pergunta de balcão, em menos de 5 segundos: _esse motorista já gerou prejuízo para alguém?_

## Stack

- **Vite** + **React 19** + **TypeScript** + **react-router-dom** (SPA)
- **Tailwind CSS 4** — usado **apenas para layout** (grid/gap/spacing/responsivo)
- **CSS do design system** em [`docs/estilo/`](docs/estilo/) — fonte única do visual
  (`tokens.css` → `tokens-3d.css`, nesta ordem; a variante plástica vence)
- **Supabase** (Auth, Postgres, Storage) — sem ORM, `@supabase/supabase-js` direto
- **Vitest** + **ESLint** + **Prettier**
- Deploy: **Vercel** + **Supabase Cloud**

## Comandos

```bash
npm run dev          # servidor de desenvolvimento (Vite)
npm run build        # build de produção (gera dist/)
npm run preview      # serve o build local
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

## Banco de dados

O DDL vive em [`supabase/migrations/`](supabase/migrations/) e o controle do que já
rodou fica na tabela `public._migrations_aplicadas` do próprio banco.

```powershell
. .\scripts\supabase.ps1              # helper da API Supabase (lê o .env)
. .\scripts\aplicar-migrations.ps1    # aplica só o que ainda não rodou
. .\scripts\seed.ps1                  # cria as 3 contas de teste e dados de exemplo
. .\scripts\verificar-t04.ps1         # 30 verificações de regra de dados (PASS/FALHA)
```

As contas criadas pelo seed usam as senhas `SEED_SENHA_*` do `.env`
(ver [`.env.example`](.env.example)); elas nunca ficam no código.

`verificar-t04.ps1` **altera** dados de exemplo (muda estado de incidente e tira
a locadora da fila). Antes de repetir a verificação, rode o `seed.ps1` de novo
para devolver os dados ao estado inicial.

**Postura de segurança** ([ADR 0003](docs/adr/0003-stack-sem-orm.md)):

- RLS ligado em **todas** as tabelas, sem nenhum `policy` de `select` comum;
- privilégios de tabela revogados de `anon` e `authenticated`;
- todo acesso de negócio passa por funções `SECURITY DEFINER` (RPC);
- Storage é a exceção: bucket `anexos` privado, com policies por pasta
  `{locadora_id}/...` — um anexo nunca sai da locadora dona.

## Documentação de decisão

| Arquivo                                                                      | Conteúdo                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md)                                       | vocabulário canônico do domínio                         |
| [`docs/adr/0001-rede-visibilidade.md`](docs/adr/0001-rede-visibilidade.md)   | o que a rede enxerga + regra anti-marketplace           |
| [`docs/adr/0002-identidade-por-cpf.md`](docs/adr/0002-identidade-por-cpf.md) | identidade única por CPF e busca por nome               |
| [`docs/adr/0003-stack-sem-orm.md`](docs/adr/0003-stack-sem-orm.md)           | supabase-js direto e leitura via RPC `security definer` |
| [`docs/estilo/`](docs/estilo/)                                               | design system base (tokens, catálogo, landing)          |
