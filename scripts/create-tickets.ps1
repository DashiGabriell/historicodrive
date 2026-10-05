# Cria os issues de ticket no GitHub (idempotente: pula o que já existe).
# Uso: pwsh scripts/create-tickets.ps1

$repo = "DashiGabriell/historicodrive"

$labels = @(
  @{ name = "ticket"; color = "1d76db"; desc = "Ticket tracer-bullet do plano" },
  @{ name = "pronto"; color = "0e8a16"; desc = "Entrega concluida e verificada" }
)

foreach ($l in $labels) {
  gh label create $l.name --repo $repo --color $l.color --description $l.desc --force 2>&1 | Out-Null
}

$existentes = @(gh issue list --repo $repo --state all --limit 100 --json number,title |
  ConvertFrom-Json | ForEach-Object { $_.title })

$tickets = @(
  @{
    n = "T03"; t = "T03 - Design system React (/styleguide)"
    b = @'
## Escopo
- `src/ui/` com wrapper das classes do ESTILO: `Botao`, `Card`, `Badge`, `Campo`, `Tabela`, `Metrica`, `Alerta`, `Esqueleto`, `Vazio`.
- Rota `/styleguide` reproduzindo `docs/estilo/design-system - 3d.html` em React.
- Uso de Tailwind **so para layout** (grid/gap/spacing). Cor, borda, sombra e estado vem do CSS.

## Bloqueia
T06, T08

## Pronto quando
`npm run lint`, `npm run typecheck` e `npm test` verdes; cada componente visivel em `/styleguide`.
'@
  },
  @{
    n = "T04"; t = "T04 - Schema Supabase, RLS e seed"
    b = @'
## Escopo
- Tabelas: `locadora`, `perfil`, `perfil_locadora` (N:N), `motorista` (cpf unique), `incidente`, `anexo`, `audit_log` (append-only).
- Enums: `estado` (suspeita|confirmado|contestado), `confianca` (baixa|media|alta), `tipo_incidente`, `status_locadora` (pendente|aprovada|recusada).
- `incidente.placa` texto com validacao de formato (Mercosul e antigo).
- RLS ligado em todas as tabelas, policy por policy.
- RPC `security definer`: `buscar_motorista`, `abrir_ficha`, `painel_kpis`.
- Trigger de `audit_log` nas mutacoes de `incidente`.
- `.env.example` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Seed: superadmin, locadora A (aprovada), locadora B (aprovada).

## Bloqueia
T05, T08

## Pronto quando
Schema aplicado num Supabase real, 3 logins existem, e um `select` direto no editor **nao** devolve dado de outra locadora.
'@
  },
  @{
    n = "T05"; t = "T05 - Auth, sessao e portao de rota"
    b = @'
## Escopo
- `@supabase/supabase-js`: login e-mail + senha (8+), "esqueci minha senha" por link, sessao de 7 dias.
- `proxy.ts` (Next 16 - nao usar `middleware.ts`) redireciona nao autenticado.
- Portoes: `/admin/**` exige `superadmin`; `/painel/**` e `/incidente/**` exigem `dono` com locadora ativa.
- Troca de locadora (N:N) gravando a locadora ativa na sessao.

## Bloqueia
T06, T07, T08

## Pronto quando
Sem sessao, qualquer rota protegida cai no `/login`; `dono` nao alcanca `/admin` e vice-versa.
'@
  },
  @{
    n = "T06"; t = "T06 - Landing, auto-cadastro e fila do superadmin"
    b = @'
## Escopo
- Tela 1: `docs/estilo/home.html` vira `/` - marca "Meritum" -> "HistóricoDrive", textos do produto, botao para o cadastro.
- Tela 2: form "Sou locadora" publico -> `locadora` com `status = pendente` + criacao do usuario `dono`.
- Tela 3: `/admin/locadoras` - fila de pendentes, aprovar / recusar com motivo. So `superadmin`.

## Bloqueia
T12

## Pronto quando
Cadastrar uma locadora nova gera pendente; o superadmin aprova e o dono consegue logar.
'@
  },
  @{
    n = "T07"; t = "T07 - Configuracoes da locadora e seletor N:N"
    b = @'
## Escopo
- Tela 9: `/config` - dados da locadora + toggle `receber_da_rede` (default true).
- Seletor de locadora no topo, **aparece apenas** quando o usuario pertence a mais de uma.
- Editar dados grava `audit_log`.

## Bloqueia
T10, T12

## Pronto quando
Dono de duas locadoras troca pelo seletor e todo dado da tela muda junto; `superadmin` nao alcanca `/config`.
'@
  },
  @{
    n = "T08"; t = "T08 - Criacao de incidente + audit_log"
    b = @'
## Escopo
- Tela 7: busca do motorista por CPF (ou nome -> lista sem contagem -> confirma CPF/CNH), placa com validacao, tipo fixo, valor, descricao.
- Grava `incidente` com `estado = suspeita` e `audit_log` append-only.
- So `dono`; `superadmin` **nao** cria incidente.

## Bloqueia
T09, T10, T11, T12, T13

## Pronto quando
Um incidente criado aparece na ficha do motorista, tem linha em `audit_log` com ator/acao/antes/depois, e tentativa de `update`/`delete` em `audit_log` falha.
'@
  },
  @{
    n = "T09"; t = "T09 - Fotos do incidente (passo 1)"
    b = @'
## Escopo
- Passo 1 em 30s: `input[type=file][accept=image/*][capture=environment]`, maximo 6 anexos, storage bucket **privado**, URL assinada de 1h.
- Rascunho em `localStorage` (recuperacao apos refresh/perda de conexao).
- Passo 1 salva antes do passo 2 (fotos primeiro - prova nao se perde).

## Bloqueia
T11

## Pronto quando
Foto tirada no celular vira anexo privado; URL expira em 1h; refresh da pagina restaura o rascunho.
'@
  },
  @{
    n = "T10"; t = "T10 - Busca, ficha do motorista e visibilidade da rede"
    b = @'
## Escopo (o coracao do produto)
- Tela 5: `/busca` - CPF direto, ou nome completo -> lista **sem contagem**, clique pede CPF/CNH.
- Tela 6: `/motorista/[id]` - dados, CPF mascarado quando o registro veio da rede, lista de incidentes **visiveis**.
- RPC `buscar_motorista` / `abrir_ficha` implementando a ADR 0001 (3 camadas) e a ADR 0002 (anti-marketplace).

## Bloqueia
T12, T14

## Pronto quando
Nenhum caminho devolve lista sem termo digitado; `suspeita` da locadora B nao aparece para a A; `confirmado`+alta da A aparece para a B com `receber_da_rede = true`; anexo nunca carrega.
'@
  },
  @{
    n = "T11"; t = "T11 - Detalhe do incidente e mudanca de estado"
    b = @'
## Escopo
- Tela 8: `/incidente/[id]` - anexos, descricao, valor, autor, datas.
- Transicao `suspeita -> confirmado -> contestado` com **motivo obrigatorio**.
- Nada se apaga: nao existe botao de exclusao.

## Bloqueia
T14

## Pronto quando
`contestado` pede motivo; toda transicao gera linha em `audit_log`; nao ha rota que delete um incidente.
'@
  },
  @{
    n = "T12"; t = "T12 - Painel de KPIs"
    b = @'
## Escopo
- Tela 4: `/painel` - prejuizo acumulado (R$), incidentes por mes, tipos, placas mais atingidas + grafico de barras mensal.
- **So** dados da propria locadora. **Nenhuma** exportacao (sem CSV, sem PDF).

## Bloqueia
T14

## Pronto quando
Numeros batem com a soma manual da locadora; dado da outra locadora nao entra; nenhum botao de export existe.
'@
  },
  @{
    n = "T13"; t = "T13 - Tela de auditoria"
    b = @'
## Escopo
- Tela 10: `/auditoria` - lista filtravel por ator, acao, alvo e periodo, com antes/depois.
- Escrita proibida a partir da aplicacao (append-only garantido no banco).

## Bloqueia
(tela final)

## Pronto quando
O dono ve a propria acao mais recente com ator e timestamp; nao ha interface de edicao.
'@
  },
  @{
    n = "T14"; t = "T14 - Vitest das regras de dominio"
    b = @'
## Escopo
Testes de unidade em:
- visibilidade da rede (3 camadas da ADR 0001)
- dedupe e busca por CPF / nome (ADR 0002)
- maquina de estados do incidente
- calculo dos KPIs
- validacao de placa (Mercosul e antigo)

## Bloqueia
T15

## Pronto quando
`npm test` verde cobrindo os cinco eixos; cada teste falha se a regra for quebrada de proposito.
'@
  },
  @{
    n = "T15"; t = "T15 - Deploy, checklist de RLS e uso real"
    b = @'
## Escopo
- Projeto Supabase cloud + Vercel, variaveis de ambiente configuradas.
- **Checklist manual de RLS** com 2 contas reais de locadoras diferentes: select, RPC, storage e audit_log.
- Criterio de pronto do produto: registrar um incidente do celular, buscar no PC, ver o KPI mudar.
- 3 dias de uso real antes de qualquer coisa nova.

## Bloqueia
nenhum - e o ultimo

## Pronto quando
Checklist assinado e o produto usado de verdade.
'@
  }
)

$criados = 0
$existentesCount = 0

foreach ($tk in $tickets) {
  $titulo = $tk.t
  if ($existentes -contains $titulo) {
    $existentesCount++
    continue
  }
  $tmp = Join-Path $env:TEMP ("ticket-" + $tk.n + ".md")
  Set-Content -LiteralPath $tmp -Value $tk.b -Encoding UTF8
  gh issue create --repo $repo --title $titulo --body-file $tmp --label "ticket" | Out-Null
  if ($LASTEXITCODE -eq 0) { $criados++ }
  Remove-Item -LiteralPath $tmp -Force
}

"criados=$criados ja-existiam=$existentesCount"
gh issue list --repo $repo --state open --limit 30 --json number,title --template "{{range .}}{{.number}} {{.title}}{{"\n"}}{{end}}"
