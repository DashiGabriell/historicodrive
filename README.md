# HistóricoDrive

Plataforma interna para **registrar e consultar o histórico de incidentes de motoristas** em locadoras de veículos pequenas. O produto responde a uma pergunta de balcão, em menos de 5 segundos: _esse motorista já gerou prejuízo para alguém?_

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS 4** — usado **apenas para layout** (grid/gap/spacing/responsivo)
- **CSS do design system** em [`docs/estilo/`](docs/estilo/) — fonte única do visual
  (`tokens.css` → `tokens-3d.css`, nesta ordem; a variante plástica vence)
- **Supabase** (Auth, Postgres, Storage) — sem ORM, `@supabase/supabase-js` direto
- **Vitest** + **ESLint** + **Prettier**
- Deploy: **Vercel** + **Supabase Cloud**

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run lint         # eslint
npm run format       # prettier --write
npm run typecheck    # tsc --noEmit
npm test             # vitest run
```

## Documentação de decisão

| Arquivo                                                                      | Conteúdo                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`docs/GLOSSARY.md`](docs/GLOSSARY.md)                                       | vocabulário canônico do domínio                         |
| [`docs/adr/0001-rede-visibilidade.md`](docs/adr/0001-rede-visibilidade.md)   | o que a rede enxerga + regra anti-marketplace           |
| [`docs/adr/0002-identidade-por-cpf.md`](docs/adr/0002-identidade-por-cpf.md) | identidade única por CPF e busca por nome               |
| [`docs/adr/0003-stack-sem-orm.md`](docs/adr/0003-stack-sem-orm.md)           | supabase-js direto e leitura via RPC `security definer` |
| [`docs/estilo/`](docs/estilo/)                                               | design system base (tokens, catálogo, landing)          |
