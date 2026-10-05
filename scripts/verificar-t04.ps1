# HistóricoDrive — verificacao das regras de dados do banco (T04).
# Uso: . .\scripts\supabase.ps1 ; . .\scripts\verificar-t04.ps1

$e = Get-HdEnv
$base = $e['NEXT_PUBLIC_SUPABASE_URL']
$pub = $e['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
$falhas = 0

function Ok([string]$nome, [bool]$cond, [string]$detalhe = "") {
  if ($cond) { Write-Host "  PASS  $nome $detalhe" -ForegroundColor Green }
  else { Write-Host "  FALHA $nome $detalhe" -ForegroundColor Red; $script:falhas++ }
}

function Login($email, $pass) {
  $b = @{ email = $email; password = $pass } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/auth/v1/token?grant_type=password" -Method POST `
    -Headers @{ apikey = $pub; Authorization = "Bearer $pub"; 'Content-Type' = 'application/json' } -Body $b
}

function Rpc($s, $fn, $body) {
  $j = $body | ConvertTo-Json -Depth 8
  try {
    Invoke-RestMethod -Uri "$base/rest/v1/rpc/$fn" -Method POST `
      -Headers @{ apikey = $pub; Authorization = "Bearer $($s.access_token)"; 'Content-Type' = 'application/json' } -Body $j
  }
  catch {
    $r = $_.Exception.Response
    $msg = $_.ErrorDetails.Message
    if (-not $msg -and $r) { $sr = New-Object IO.StreamReader($r.GetResponseStream()); $msg = $sr.ReadToEnd() }
    if ($r) { return "ERRO: $msg" }
    return "ERRO: $($_.Exception.Message)"
  }
}

function Texto($x) {
  if ($null -eq $x) { return "" }
  if ($x -is [string]) { return $x }
  return ($x | ConvertTo-Json -Depth 8 -Compress)
}

$central = Login 'dono.central@historicodrive.app' 'Historico-2026!Central'
$vianorte = Login 'dono.vianorte@historicodrive.app' 'Historico-2026!ViaNorte'
$admin = Login 'admin@historicodrive.app' 'Historico-2026!Admin'

Write-Host "`n[identidade e visibilidade da rede]" -ForegroundColor Cyan
$mariaBusca = Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' }
Ok "B encontra Maria pela rede (confirmado+alta)" (@($mariaBusca).Count -eq 1) "(achados=$(@($mariaBusca).Count))"
$mariaId = @($mariaBusca)[0].motorista_id

$fichaSemCpf = Texto (Rpc $vianorte 'abrir_ficha' @{ p_motorista_id = $mariaId })
Ok "B nao abre ficha sem confirmar CPF" ($fichaSemCpf -match 'confirme o CPF') $fichaSemCpf.Substring(0, [Math]::Min(70, $fichaSemCpf.Length))

$fichaComCpf = Rpc $vianorte 'abrir_ficha' @{ p_motorista_id = $mariaId; p_cpf_confirmado = '52998224725' }
Ok "B abre ficha com CPF confirmado" ($fichaComCpf.motorista.nome_completo -eq 'Maria Aparecida Lima')
Ok "B nao ve anexo de incidente alheio" (@($fichaComCpf.incidentes[0].anexos).Count -eq 0)
Ok "B ve o autor do incidente da rede" ($fichaComCpf.incidentes[0].locadora_nome -eq 'Locadora Central')

$carlosB = Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Carlos Eduardo Souza' }
Ok "B nao encontra Carlos (so suspeita, nunca alerta)" (@($carlosB).Count -eq 0) "(achados=$(@($carlosB).Count))"

Write-Host "`n[busca crua]" -ForegroundColor Cyan
Ok "busca com termo curto e recusada" ((Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Jo' })) -match 'muito curto')
Ok "busca sem termo e recusada" ((Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = '' })) -match 'muito curto')

Write-Host "`n[criacao de incidente]" -ForegroundColor Cyan
$joana = @((Rpc $central 'buscar_motorista' @{ p_termo = 'Joana Pereira da Silva' }))[0].motorista_id
$semAnexo = Texto (Rpc $central 'criar_incidente' @{
  p_motorista_id = $joana; p_placa = 'ABC1D23'; p_tipo = 'dano_veiculo'
  p_descricao = 'Descricao de teste com mais de dez caracteres.'
})
Ok "incidente sem anexo e recusado" ($semAnexo -match 'obrigatoria') $semAnexo.Substring(0, [Math]::Min(70, $semAnexo.Length))

$anexoErrado = Texto (Rpc $central 'criar_incidente' @{
  p_motorista_id = $joana; p_placa = 'ABC1D23'; p_tipo = 'dano_veiculo'
  p_descricao = 'Descricao de teste com mais de dez caracteres.'
  p_anexos = @( @{ caminho = '22222222-2222-2222-2222-222222222222/rascunho/x.jpg' } )
})
Ok "anexo de outra locadora e recusado" ($anexoErrado -match 'fora da pasta') $anexoErrado.Substring(0, [Math]::Min(70, $anexoErrado.Length))

$placaErrada = Texto (Rpc $central 'criar_incidente' @{
  p_motorista_id = $joana; p_placa = 'XXX999'; p_tipo = 'dano_veiculo'
  p_descricao = 'Descricao de teste com mais de dez caracteres.'
  p_anexos = @( @{ caminho = '11111111-1111-1111-1111-111111111111/rascunho/x.jpg' } )
})
Ok "placa invalida e recusada" ($placaErrada -match 'placa invalida') $placaErrada.Substring(0, [Math]::Min(70, $placaErrada.Length))

Write-Host "`n[mudanca de estado]" -ForegroundColor Cyan
$lista = Rpc $central 'listar_incidentes' @{ p_limite = 10 }
$suspeita = @($lista | Where-Object { $_.estado -eq 'suspeita' })[0]
$semMotivo = Texto (Rpc $central 'mudar_estado_incidente' @{
  p_incidente_id = $suspeita.id; p_novo_estado = 'confirmado'; p_motivo = ''
})
Ok "transicao sem motivo e recusada" ($semMotivo -match 'motivo') $semMotivo.Substring(0, [Math]::Min(70, $semMotivo.Length))

$ok = Texto (Rpc $central 'mudar_estado_incidente' @{
  p_incidente_id = $suspeita.id; p_novo_estado = 'confirmado'; p_motivo = 'Contrato assinado com foto e comprovante.'
})
Ok "suspeita -> confirmado funciona" ($ok -eq '') $ok.Substring(0, [Math]::Min(70, $ok.Length))

$volta = Texto (Rpc $central 'mudar_estado_incidente' @{
  p_incidente_id = $suspeita.id; p_novo_estado = 'suspeita'; p_motivo = 'tento voltar'
})
Ok "confirmado -> suspeita e proibida" ($volta -match 'nao permitida') $volta.Substring(0, [Math]::Min(70, $volta.Length))

$alheio = Texto (Rpc $vianorte 'mudar_estado_incidente' @{
  p_incidente_id = 'bbbbbbb1-0000-4000-8000-000000000002'; p_novo_estado = 'confirmado'; p_motivo = 'tentando mexer no registro dos outros'
})
Ok "B nao mexe em incidente de A" ($alheio -match 'outra locadora') $alheio.Substring(0, [Math]::Min(70, $alheio.Length))

Write-Host "`n[papeis]" -ForegroundColor Cyan
Ok "dono nao lista pendentes" ((Texto (Rpc $central 'listar_pendentes' @{})) -match 'acesso negado')
Ok "dono nao decide locadora" ((Texto (Rpc $central 'decidir_locadora' @{ p_locadora_id = '33333333-3333-3333-3333-333333333333'; p_acao = 'aprovar'; p_motivo = '' })) -match 'acesso negado')
Ok "superadmin lista pendentes" (@(Rpc $admin 'listar_pendentes' @{}).Count -ge 1)
$pendente = @((Rpc $admin 'listar_pendentes' @{}))[0]
Ok "superadmin nao recusa sem motivo" ((Texto (Rpc $admin 'decidir_locadora' @{ p_locadora_id = $pendente.id; p_acao = 'recusar'; p_motivo = '' })) -match 'recusa exige motivo')
Ok "superadmin aprova locadora" ((Texto (Rpc $admin 'decidir_locadora' @{ p_locadora_id = $pendente.id; p_acao = 'aprovar'; p_motivo = '' })) -eq '')
$filaDepois = @(Rpc $admin 'listar_pendentes' @{} | Where-Object { $_ })
Ok "locadora aprovada sai da fila" ($filaDepois.Count -eq 0)

Write-Host "`n[leitura direta bloqueada]" -ForegroundColor Cyan
foreach ($t in @('motorista', 'incidente', 'perfil', 'locadora', 'audit_log')) {
  try {
    $r = Invoke-WebRequest -Uri "$base/rest/v1/$t`?select=*&limit=1" -Headers @{ apikey = $pub; Authorization = "Bearer $($central.access_token)" } -UseBasicParsing
    Ok "tabela $t bloqueada para authenticated" $false "(HTTP $($r.StatusCode))"
  }
  catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    Ok "tabela $t bloqueada para authenticated" ($code -eq 403) "(HTTP $code)"
  }
}
try {
  $r = Invoke-WebRequest -Uri "$base/rest/v1/motorista?select=*&limit=1" -Headers @{ apikey = $pub; Authorization = "Bearer $pub" } -UseBasicParsing
  Ok "tabela motorista bloqueada para anon" $false "(HTTP $($r.StatusCode))"
}
catch {
  $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
  Ok "tabela motorista bloqueada para anon" ($code -eq 401 -or $code -eq 403) "(HTTP $code)"
}

Write-Host ""
if ($falhas -eq 0) { Write-Host "TODAS AS VERIFICACOES PASSARAM" -ForegroundColor Green }
else { Write-Host "$falhas VERIFICACAO(ES) FALHARAM" -ForegroundColor Red }
exit $falhas
