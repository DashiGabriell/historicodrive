# 04: Hash SHA-256 de anexo no upload

**What to build:** Cada anexo enviado recebe hash SHA-256 gravado no registro e citado na auditoria, para checagem de integridade da prova da locadora.

**Blocked by:** 01 (coluna `anexo.hash`)

**Status:** conclu�do (hash exigido no banco; testes verdes)

- [x] Upload calcula SHA-256 e grava em `anexo.hash` (obrigatório no `criar_incidente`)
- [x] Audit do `incidente.criar` inclui os hashes
- [x] Tela de detalhe mostra `sha …` no anexo
- [x] Teste unitário do digest (`anexos.test.ts`)
- [ ] Teste em banco: upload real + hash conferido (`verificar-defesa.ps1` cobre recusa sem hash)
- [x] `npm run typecheck`, `lint`, `test` verdes
