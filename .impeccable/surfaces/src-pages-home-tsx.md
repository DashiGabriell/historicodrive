---
version: 1
slug: "src-pages-home-tsx"
primary_target: "src/pages/home.tsx"
related_targets: []
---

# Landing pública em `/`

- **Escopo:** rota pública `/` (`src/pages/home.tsx`), substitui a vitrine enxuta atual. Sem cabeçalho ou rodapé próprios: o cabeçalho global em `src/App.tsx` já entrega "Sou locadora" / "Entrar" ao visitante; o rodapé novo é da página.
- **Modo do visitante:** Persuade.
- **Público:** dono de locadora de veículos pequena (ou quem atende por ele), no balcão, celular ou computador da loja, conexão instável.
- **Trabalho dele:** decidir em segundos se aluga para o motorista que está na frente.
- **Ação pedida:** cadastrar a locadora (`/cadastro`), na forma de trabalho do produto — campo, busca e ficha aparecem na página, não um botão decorativo; entrada secundária `/login`.
- **Prova permitida:** só produto (PRODUCT.md): busca exata por CPF/nome, estados `suspeita → confirmado → contestado`, confiança `baixa|media|alta`, até 6 anexos por incidente, regra da rede, auditoria append-only, PWA offline. **Sem preço, sem número de clientes, cidade, tempo de operação ou testemunho.**
- **Imagem:** cena ilustrada do balcão em faixa de largura total dentro do herói, arte em `public/landing-page.jpg` (486×228, fornecida pelo usuário) exibida emoldurada sem corte, referenciada por uma constante única na página.
- **Restrições:** herdar os tokens existentes (`docs/estilo/tokens.css` → `tokens-3d.css`, nessa ordem), Tailwind só para layout, pt-BR do `docs/GLOSSARY.md`, `useTitulo()`, redirect de sessão/PWA preservado, sem novo mundo visual.
- **Momento memorável:** a placa de busca devolvendo a ficha — a pergunta de balcão respondida na própria tela.
- **Decisões em aberto:** título/OG do `index.html` ainda diz "HistóricoDrive" (fora do escopo desta rodada); arte definitiva da cena fica para o usuário trocar no slot.

## Direction contract

**THESIS:** A landing que demonstra a pergunta de balcão em vez de descrevê-la — busca exata, evidência anexada e a regra da rede provadas na tela; recusa o arranjo de categoria "herói centrado + fileira de cards iguais".

**OWN-WORLD:** Os tokens do projeto são o mundo: indigo `#6366f1` sobre `#f8fafc`, Inter 400–800, botões da variante plástica (`tokens-3d`, gradiente e relevo interno, sem sombra externa), cards de raio 1rem, Tailwind só de layout. Sem kicker/eyebrow acima de títulos, sem texto em gradiente, sem card aninhado, sem ícone emoji.

**STORY:** O visitante entende em segundos que o Histórico responde "esse motorista já gerou prejuízo?", vê a busca devolver a ficha, vê a prova (anexo) e a fronteira da rede, descobre o que fica privado na locadora dele e termina sabendo que o próximo passo é cadastrar a locadora.

**FIRST VIEWPORT:** Cabeçalho global no topo. Abaixo, faixa de largura total: título de promessa em uma linha (corpo grande, ≤6rem, tracking ≥ -0.04em), subtítulo em medida de 65–75ch, ação primária "Sou locadora" (`/cadastro`) e secundária "Entrar" (`/login`) visíveis sem rolagem. Sob a faixa, a cena ilustrada em largura total ancorando a placa de busca (campo de CPF + resultado com ficha) que começa a aparecer na borda inferior da primeira tela. Nada de três colunas iguais nesta dobra.

**FORM:** "Três provas" — 4ª estrutura da lista ordenada por ressonância; seed key 04230180, escalada para escapar do próprio risco: a prova da busca domina a página inteira, anexos e regra da rede vêm depois em escala menor e ritmo desigual.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
