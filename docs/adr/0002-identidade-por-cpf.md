# ADR 0002 — Identidade única por CPF

**Status:** aceito · **Data:** 2026-10-05 · **Decisões de apoio:** Q3, Q10, Q14, Q17, Q22

## Contexto

Várias locadoras descrevem a mesma pessoa. Se cada uma cria sua ficha, a rede não soma nada e a busca devolve três "João da Silva". Se a ficha é global mas a busca é frouxa, a rede passa a afirmar coisas sobre gente errada — o pior erro possível num produto cuja única moeda é confiança.

## Decisão

**`motorista` é uma entidade global com chave única em `cpf`.**

- **Toda ficha tem CPF.** Não existe motorista sem CPF. Se o balcão não tem o documento, **não se cria ficha** — a locadora registra o incidente depois, quando tiver.
- **Busca por CPF** → match exato → abre a ficha direto.
- **Busca por nome completo** → match exato no nome → devolve **apenas** nome + foto, **sem contagem de incidentes**, sem ordenação por relevância, sem "mais parecidos". Ao clicar, a tela **pede CPF ou CNH** para confirmar; só então a ficha e os incidentes aparecem.
- Divergência de grafia no nome não gera fusão nem sugestão. Fusão manual de fichas está fora do MVP: a única reconciliação é CPF bater.

## Consequências

- O `motorista` é a única tabela **verdadeiramente global** — tudo o que a rede aprende sobre alguém é gravado uma vez só.
- Fichas duplicadas por CPF são impedidas pela `unique constraint`; tentativa de criar duplicata vira erro de tela, não dado novo.
- A busca por nome é deliberadamente **fraca de propósito**: ela só serve para o atendente achar a ficha certa, não para afirmar quem é quem.
- O campo `foto` existe principalmente para a **conferência visual** nesse fluxo de dois passos.

## Alternativas consideradas

- **(A) Nome + data de nascimento como chave** — não deduplica; "João Silva, 12/03/1988" aparece várias vezes.
- **(B) Ficha por locadora** — a rede não soma; cada locadora descobre o mesmo motorista do zero.
- **(C) CPF obrigatório em tudo, busca por nome proibida** — seguro, mas o balcão real não tem o CPF na mão na hora de atender.
- **(D) Busca por nome mostrando já os incidentes** — é exatamente o vazamento que a [ADR 0001](0001-rede-visibilidade.md) proíbe.
