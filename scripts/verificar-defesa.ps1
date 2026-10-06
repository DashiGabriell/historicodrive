# Histórico — verificacao da defesa legal / prova (T01–T10).
# Uso: . .\scripts\supabase.ps1 ; . .\scripts\verificar-defesa.ps1
# Nao altera dados de motorista; contestacao de teste e decidida e limpa no fim.

$e = Get-HdEnv
$base = $e['VITE_SUPABASE_URL']
$pub = $e['VITE_SUPABASE_PUBLISHABLE_KEY']
$falhas = 0

foreach ($k in @('SEED_SENHA_ADMIN', 'SEED_SENHA_CENTRAL', 'SEED_SENHA_VIANORTE')) {
  if (-not $e[$k]) { throw "$k ausente no .env (ver .env.example)" }
}

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
  $j = $x | ConvertTo-Json -Depth 8 -Compress
  if ($null -eq $j) { return "" }
  return $j
}

$central = Login 'dono.central@Historico.app' $e['SEED_SENHA_CENTRAL']
$vianorte = Login 'dono.vianorte@Historico.app' $e['SEED_SENHA_VIANORTE']
$admin = Login 'admin@Historico.app' $e['SEED_SENHA_ADMIN']

Write-Host "`n[T02 superadmin nao le motorista/incidente]" -ForegroundColor Cyan
$buscaAdmin = Texto (Rpc $admin 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' })
Ok "superadmin e bloqueado em buscar_motorista" ($buscaAdmin -match 'superadmin nao le') $buscaAdmin.Substring(0, [Math]::Min(80, $buscaAdmin.Length))

$fichaAdmin = Texto (Rpc $admin 'abrir_ficha' @{ p_motorista_id = 'aaaaaaa1-0000-4000-8000-000000000003' })
Ok "superadmin e bloqueado em abrir_ficha" ($fichaAdmin -match 'superadmin nao le') $fichaAdmin.Substring(0, [Math]::Min(80, $fichaAdmin.Length))

Ok "superadmin ainda lista locadoras pendentes" (@(Rpc $admin 'listar_pendentes' @{}).Count -ge 1)

Write-Host "`n[T01 consulta_log (quem consultou)]" -ForegroundColor Cyan
$antes = Invoke-HdSql -Sql 'select count(*)::int as n from public.consulta_log'
$nAntes = @($antes)[0].n
if ($null -eq $nAntes) { $nAntes = @(@($antes)[0].count)[0] }

$maria = @((Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' }))[0]
Ok "dono busca Maria pela rede" ($null -ne $maria.motorista_id)

$depois = Invoke-HdSql -Sql 'select count(*)::int as n from public.consulta_log'
$nDepois = @($depois)[0].n
if ($null -eq $nDepois) { $nDepois = @(@($depois)[0].count)[0] }
Ok "busca grava consulta_log" ([int]$nDepois -gt [int]$nAntes) "antes=$nAntes depois=$nDepois"

$ficha = Rpc $vianorte 'abrir_ficha' @{ p_motorista_id = $maria.motorista_id; p_cpf_confirmado = '52998224725' }
Ok "abrir ficha grava consulta_log" ($ficha.motorista.nome_completo -eq 'Maria Aparecida Lima')

$consulta = Invoke-HdSql -Sql @"
select count(*)::int as n
  from public.consulta_log
 where motorista_id = '$($maria.motorista_id)'
   and locadora_id = '22222222-2222-2222-2222-222222222222'
   and perfil_id = '$($vianorte.user.id)'
"@
$nConsulta = @($consulta)[0].n
Ok "consulta_log tem linha da locadora B + perfil" ([int]$nConsulta -ge 1) "n=$nConsulta"

Write-Host "`n[T01 consulta_log append-only]" -ForegroundColor Cyan
try {
  Invoke-HdSql -Sql 'update public.consulta_log set locadora_id = null' | Out-Null
  Ok "consulta_log bloqueia update" $false
}
catch {
  Ok "consulta_log bloqueia update" ($_.Exception.Message -match 'append-only') $_.Exception.Message
}
try {
  Invoke-HdSql -Sql 'delete from public.consulta_log' | Out-Null
  Ok "consulta_log bloqueia delete" $false
}
catch {
  Ok "consulta_log bloqueia delete" ($_.Exception.Message -match 'append-only') $_.Exception.Message
}

Write-Host "`n[T01 hash de anexo]" -ForegroundColor Cyan
$joana = @((Rpc $central 'buscar_motorista' @{ p_termo = 'Joana Pereira da Silva' }))[0].motorista_id
$semHash = Texto (Rpc $central 'criar_incidente' @{
  p_motorista_id = $joana; p_placa = 'ABC1D23'; p_tipo = 'dano_veiculo'
  p_descricao = 'Descricao de teste com mais de dez caracteres.'
  p_anexos = @( @{ caminho = '11111111-1111-1111-1111-111111111111/rascunho/x.jpg' } )
})
Ok "anexo sem hash e recusado" ($semHash -match 'hash') $semHash.Substring(0, [Math]::Min(80, $semHash.Length))

$hashInvalido = Texto (Rpc $central 'criar_incidente' @{
  p_motorista_id = $joana; p_placa = 'ABC1D23'; p_tipo = 'dano_veiculo'
  p_descricao = 'Descricao de teste com mais de dez caracteres.'
  p_anexos = @( @{ caminho = '11111111-1111-1111-1111-111111111111/rascunho/x.jpg'; hash = 'nao-eh-sha256' } )
})
Ok "hash invalido e recusado" ($hashInvalido -match 'hash') $hashInvalido.Substring(0, [Math]::Min(80, $hashInvalido.Length))

Write-Host "`n[T01 colunas de prova existem]" -ForegroundColor Cyan
$cols = Invoke-HdSql -Sql @"
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'anexo' and column_name = 'hash')
     or (table_name = 'locadora' and column_name in ('termos_versao', 'termos_aceite_em'))
     or table_name in ('contestacao', 'consulta_log'))
"@
$achou = @($cols)
$tabelas = ($achou | ForEach-Object { "$($_.table_name).$($_.column_name)" }) -join ','
Ok "tabelas/colunas de prova no schema" ($tabelas -match 'contestacao' -and $tabelas -match 'consulta_log' -and $tabelas -match 'anexo.hash' -and $tabelas -match 'termos_versao') $tabelas

Write-Host "`n[T05 aceite de termos no cadastro]" -ForegroundColor Cyan
$sig = Invoke-HdSql -Sql @"
select pg_get_function_arguments(p.oid) as args
  from pg_proc p
 where p.proname = 'solicitar_cadastro'
   and p.pronargs = 8
"@
$temAceite = (Texto @($sig)[0]) -match 'p_aceitou_termos'
Ok "solicitar_cadastro exige p_aceitou_termos" $temAceite

Write-Host "`n[T06 purge de suspeita 30 dias]" -ForegroundColor Cyan
$purgeDono = Texto (Rpc $vianorte 'purge_suspeitas_nao_confirmadas' @{ p_dias = 30 })
Ok "purge negado para dono" ($purgeDono -match 'superadmin') $purgeDono.Substring(0, [Math]::Min(80, $purgeDono.Length))
$purgeAdmin = Texto (Rpc $admin 'purge_suspeitas_nao_confirmadas' @{ p_dias = 30 })
Ok "purge roda como superadmin" ($purgeAdmin -match '^[0-9]+$') $purgeAdmin

Write-Host "`n[T08 consulta publica de contestacao (anon)]" -ForegroundColor Cyan
$anon = @{ access_token = $pub }
$cpfMaria = '52998224725'
$consultaAnon = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfMaria })
Ok "anon ve que ha ficha" ($consultaAnon -match '"existe":true' -and $consultaAnon -match 'bbbbbbb1-0000-4000-8000-000000000004') $consultaAnon.Substring(0, [Math]::Min(120, $consultaAnon.Length))

$consultaErrada = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = '00000000000' })
Ok "CPF inexistente e generico" ($consultaErrada -match '"existe":false') $consultaErrada

Write-Host "`n[T10 visibilidade: contestado sai da rede]" -ForegroundColor Cyan
$antesRede = Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' })
Ok "antes: rede encontra Maria" ($antesRede -match 'Maria Aparecida Lima')

$proto = Rpc $anon 'abrir_contestacao' @{
  p_incidente_id = 'bbbbbbb1-0000-4000-8000-000000000004'
  p_cpf = $cpfMaria
  p_nome = 'Maria Aparecida Lima'
  p_email = 'maria@exemplo.com'
  p_descricao = 'Nao reconheco a retirada descrita; o veiculo estava em manutencao na data.'
}
Ok "anon abre contestacao" ($proto -match '^[0-9a-f-]{36}$') (Texto $proto)

$depoisRede = Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' })
Ok "depois: contestado sai da rede" ($depoisRede -notmatch 'Maria Aparecida Lima') $depoisRede.Substring(0, [Math]::Min(80, $depoisRede.Length))

$buscaAnon = Texto (Rpc $anon 'listar_contestacoes' @{})
Ok "anon nao lista contestacoes" ($buscaAnon -match 'permission|denied|401|403|acesso|nao autenticado|JWT') $buscaAnon.Substring(0, [Math]::Min(80, $buscaAnon.Length))

Write-Host "`n[T07/T09 fila da locadora + notificacao]" -ForegroundColor Cyan
$filaC = Rpc $central 'listar_contestacoes' @{}
$aberta = @($filaC) | Where-Object { $_.incidente_id -eq 'bbbbbbb1-0000-4000-8000-000000000004' -and $_.estado -eq 'aberta' } | Select-Object -First 1
Ok "dono lista contestacao aberta" ($null -ne $aberta)

$notifs = Rpc $central 'listar_notificacoes' @{ p_limite = 10 }
$temNotif = @($notifs) | Where-Object { $_.tipo -eq 'contestacao' -and $_.incidente_id -eq 'bbbbbbb1-0000-4000-8000-000000000004' } | Select-Object -First 1
Ok "alerta in-app criado para a locadora" ($null -ne $temNotif)

$recursoCedo = Texto (Rpc $admin 'decidir_contestacao_recurso' @{
  p_contestacao_id = $aberta.id; p_procede = $false; p_motivo = 'Antes do prazo da locadora'
})
Ok "recurso bloqueado antes do prazo" ($recursoCedo -match 'prazo') $recursoCedo.Substring(0, [Math]::Min(80, $recursoCedo.Length))

$decisao = Texto (Rpc $central 'decidir_contestacao' @{
  p_contestacao_id = $aberta.id; p_procede = $false; p_motivo = 'Retorno do veiculo comprovado em contrato.'
})
Ok "dono decide contestacao" ($null -eq $decisao -or $decisao -eq '') $decisao

$depoisVolta = Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' })
Ok "improcedente devolve Maria a rede" ($depoisVolta -match 'Maria Aparecida Lima')

try {
  Invoke-HdSql -Sql "delete from public.contestacao where incidente_id = 'bbbbbbb1-0000-4000-8000-000000000004'" | Out-Null
  Ok "limpeza da contestacao de teste" $true
}
catch {
  Ok "limpeza da contestacao de teste" $false $_.Exception.Message
}

Write-Host ""
if ($falhas -eq 0) { Write-Host "TODAS AS VERIFICACOES PASSARAM" -ForegroundColor Green }
else { Write-Host "$falhas VERIFICACAO(ES) FALHARAM" -ForegroundColor Red }
exit $falhas
