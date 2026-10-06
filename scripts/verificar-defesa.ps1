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
$nascMaria = '1993-07-21'

$soCpf = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfMaria; p_nascimento = $null })
Ok "so o CPF nao revela ficha" ($soCpf -match '"existe":false') $soCpf

$nascErrado = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfMaria; p_nascimento = '1990-01-01' })
Ok "nascimento errado nao revela ficha" ($nascErrado -match '"existe":false') $nascErrado

$consultaAnon = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfMaria; p_nascimento = $nascMaria })
Ok "CPF + nascimento confirmam ficha contestavel" ($consultaAnon -match '"existe":true' -and $consultaAnon -match '"contestavel":true') $consultaAnon
Ok "consulta nao lista incidente nem locadora" ($consultaAnon -notmatch 'bbbbbbb1|locadora|incidentes') $consultaAnon

$consultaErrada = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = '00000000000'; p_nascimento = $nascMaria })
Ok "CPF inexistente e generico" ($consultaErrada -match '"existe":false') $consultaErrada

Write-Host "`n[T08 limite de tentativas no canal publico]" -ForegroundColor Cyan
$cpfFicticio = '11122233344'
1..5 | ForEach-Object { Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfFicticio; p_nascimento = '2000-01-01' } | Out-Null }
$bloqueio = Texto (Rpc $anon 'consultar_ficha_contestacao' @{ p_cpf = $cpfFicticio; p_nascimento = '2000-01-01' })
Ok "6a consulta do mesmo CPF na hora e bloqueada" ($bloqueio -match 'muitas tentativas') $bloqueio.Substring(0, [Math]::Min(80, $bloqueio.Length))

$tentativas = Invoke-HdSql -Sql "select count(*)::int as n from public.tentativa_publica where chave ~ '^[0-9a-f]{64}$'"
$semTexto = Invoke-HdSql -Sql "select count(*)::int as n from public.tentativa_publica where chave in ('$cpfMaria', '$cpfFicticio')"
Ok "tentativas guardam so HMAC, sem CPF" ([int]@($tentativas)[0].n -ge 6 -and [int]@($semTexto)[0].n -eq 0) "hmac=$(@($tentativas)[0].n)"

Write-Host "`n[T10 visibilidade: contestado sai da rede]" -ForegroundColor Cyan
$antesRede = Texto (Rpc $vianorte 'buscar_motorista' @{ p_termo = 'Maria Aparecida Lima' })
Ok "antes: rede encontra Maria" ($antesRede -match 'Maria Aparecida Lima')

$pedido = @{
  p_cpf = $cpfMaria
  p_nascimento = '1990-01-01'
  p_nome = 'Maria Aparecida Lima'
  p_email = 'maria@exemplo.com'
  p_descricao = 'Nao reconheco a retirada descrita; o veiculo estava em manutencao na data.'
}
$protoErrado = Texto (Rpc $anon 'abrir_contestacao' $pedido)
Ok "nascimento errado nao abre contestacao" ($protoErrado -match '"ok":false') $protoErrado

$pedido.p_nascimento = $nascMaria
$proto = Rpc $anon 'abrir_contestacao' $pedido
Ok "anon abre contestacao com CPF + nascimento" ($proto.ok -eq $true -and @($proto.protocolos).Count -eq 1 -and @($proto.protocolos)[0] -match '^[0-9a-f-]{36}$') (Texto $proto)

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

$reabrir = Texto (Rpc $anon 'abrir_contestacao' $pedido)
Ok "improcedente nao reabre pelo canal publico" ($reabrir -match 'nada_a_contestar') $reabrir

try {
  Invoke-HdSql -Sql "delete from public.contestacao where incidente_id = 'bbbbbbb1-0000-4000-8000-000000000004'" | Out-Null
  Ok "limpeza da contestacao de teste" $true
}
catch {
  Ok "limpeza da contestacao de teste" $false $_.Exception.Message
}

Write-Host "`n[superficie de RPC]" -ForegroundColor Cyan
$superficie = @(Invoke-HdSql -Sql @"
select
  coalesce((select string_agg(p.proname, ',' order by p.proname)
              from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and has_function_privilege('anon', p.oid, 'execute')), '') as anon,
  coalesce((select string_agg(p.proname, ',' order by p.proname)
              from pg_proc p
             where p.pronamespace = 'public'::regnamespace
               and has_function_privilege('authenticated', p.oid, 'execute')
               and p.proname in ('registrar_auditoria', 'registrar_consulta', 'criar_notificacao',
                                 'finalizar_contestacao', 'existe_visivel_para', 'expurgar_incidente',
                                 'aplicar_retencao', 'processar_descarte_anexos', 'redigir_trilha',
                                 'limitar_tentativa', 'verificar_titular', 'chave_privada')), '') as vazadas
"@)[0]
Ok "funcoes internas fora de anon/authenticated" ($superficie.vazadas -eq '') $superficie.vazadas
Ok "anon so executa o canal de contestacao" ($superficie.anon -eq 'abrir_contestacao,consultar_ficha_contestacao') $superficie.anon
$forjar = Texto (Rpc $central 'registrar_auditoria' @{
  p_locadora_id = '22222222-2222-2222-2222-222222222222'; p_acao = 'forjado'
  p_alvo_tipo = 'incidente'; p_alvo_id = 'bbbbbbb1-0000-4000-8000-000000000003'
})
Ok "dono nao forja audit_log" ($forjar -match 'permission|denied|42501|PGRST') $forjar.Substring(0, [Math]::Min(80, $forjar.Length))

Write-Host "`n[storage: pasta ativa, rascunho orfao e prova protegida]" -ForegroundColor Cyan
function Storage($s, [string]$metodo, [string]$caminho, $corpo) {
  $h = @{ apikey = $pub; Authorization = "Bearer $($s.access_token)" }
  try {
    if ($metodo -eq 'POST') {
      $h['Content-Type'] = 'image/png'
      Invoke-RestMethod -Uri "$base/storage/v1/object/anexos/$caminho" -Method POST -Headers $h -Body $corpo | Out-Null
    }
    else {
      $h['Content-Type'] = 'application/json'
      $b = @{ prefixes = @($caminho) } | ConvertTo-Json
      Invoke-RestMethod -Uri "$base/storage/v1/object/anexos" -Method DELETE -Headers $h -Body $b | Out-Null
    }
    return 'ok'
  }
  catch { return "ERRO: $($_.Exception.Message)" }
}
function ExisteObjeto([string]$caminho) {
  $r = Invoke-HdSql -Sql "select count(*)::int as n from storage.objects where bucket_id = 'anexos' and name = '$caminho'"
  return [int]@($r)[0].n -gt 0
}
$png = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
$pastaC = '11111111-1111-1111-1111-111111111111'
$orfao = "$pastaC/rascunho/verif-$([guid]::NewGuid()).png"
$prova = "$pastaC/rascunho/verif-$([guid]::NewGuid()).png"

Ok "dono envia para o proprio rascunho" ((Storage $central 'POST' $orfao $png) -eq 'ok')
Ok "dono nao envia fora de rascunho" ((Storage $central 'POST' "$pastaC/outra/verif.png" $png) -ne 'ok')
Ok "dono nao envia para pasta de outra locadora" ((Storage $vianorte 'POST' "$pastaC/rascunho/verif-intruso.png" $png) -ne 'ok')

Storage $vianorte 'DELETE' $orfao $null | Out-Null
Ok "outra locadora nao apaga o arquivo" (ExisteObjeto $orfao)
Storage $central 'DELETE' $orfao $null | Out-Null
Ok "dono apaga rascunho orfao" (-not (ExisteObjeto $orfao))

Storage $central 'POST' $prova $png | Out-Null
Invoke-HdSql -Sql @"
insert into public.anexo (incidente_id, locadora_id, caminho, content_type, bytes, hash)
values ('bbbbbbb1-0000-4000-8000-000000000004', '$pastaC', '$prova', 'image/png', 8, repeat('a', 64))
"@ | Out-Null
Storage $central 'DELETE' $prova $null | Out-Null
Ok "anexo vinculado a incidente nao e apagado pelo cliente" (ExisteObjeto $prova)

Write-Host "`n[retencao: descarte de arquivo pela Storage API]" -ForegroundColor Cyan
Invoke-HdSql -Sql @"
delete from public.anexo where caminho = '$prova';
insert into public.anexo_descarte (caminho) values ('$prova') on conflict do nothing;
"@ | Out-Null
$disparos = @(Invoke-HdSql -Sql "select public.processar_descarte_anexos() as n")[0].n
$sumiu = $false
foreach ($i in 1..10) {
  Start-Sleep -Seconds 2
  if (-not (ExisteObjeto $prova)) { $sumiu = $true; break }
}
Ok "job de descarte apaga o arquivo no storage" ($sumiu) "disparos=$disparos"
Invoke-HdSql -Sql "select public.processar_descarte_anexos()" | Out-Null
$naFila = @(Invoke-HdSql -Sql "select count(*)::int as n from public.anexo_descarte where caminho = '$prova'")[0].n
Ok "fila de descarte esvazia" ([int]$naFila -eq 0) "fila=$naFila"

Write-Host "`n[retencao: expurgo minimiza a trilha]" -ForegroundColor Cyan
$velho = 'bbbbbbb1-0000-4000-8000-000000000099'
Invoke-HdSql -Sql @"
insert into public.incidente (id, motorista_id, locadora_id, placa, tipo, descricao, estado, confianca, criado_por, criado_em)
values ('$velho', 'aaaaaaa1-0000-4000-8000-000000000002', '$pastaC', 'OLD1A23', 'dano_veiculo',
        'Descricao sensivel que precisa sumir no expurgo.', 'suspeita', 'media', '$($central.user.id)', now() - interval '40 days')
on conflict (id) do nothing;
insert into public.audit_log (locadora_id, ator, acao, alvo_tipo, alvo_id, antes, depois)
values ('$pastaC', '$($central.user.id)', 'incidente.criar', 'incidente', '$velho', null,
        jsonb_build_object('estado', 'suspeita', 'placa', 'OLD1A23', 'descricao', 'Descricao sensivel'));
"@ | Out-Null
$expurgo = Texto (Rpc $admin 'purge_suspeitas_nao_confirmadas' @{ p_dias = 30 })
$resto = @(Invoke-HdSql -Sql "select count(*)::int as n from public.incidente where id = '$velho'")[0].n
Ok "suspeita de 40 dias e expurgada" ([int]$expurgo -ge 1 -and [int]$resto -eq 0) "purge=$expurgo"
$trilha = Texto @(Invoke-HdSql -Sql "select coalesce(string_agg(acao || ':' || coalesce(antes::text, '') || coalesce(depois::text, ''), ' | '), '') as t from public.audit_log where alvo_id = '$velho'")[0].t
Ok "trilha mantem a acao sem placa nem descricao" ($trilha -match 'incidente.criar' -and $trilha -match 'incidente.purge' -and $trilha -notmatch 'OLD1A23|Descricao sensivel') $trilha
try {
  Invoke-HdSql -Sql "update public.audit_log set depois = null where alvo_id = '$velho'" | Out-Null
  Ok "audit_log segue append-only fora da redacao" $false
}
catch {
  Ok "audit_log segue append-only fora da redacao" ($_.Exception.Message -match 'append-only') ''
}

$cron = @(Invoke-HdSql -Sql "select string_agg(jobname, ',' order by jobname) as j from cron.job where active")[0].j
Ok "retencao e descarte agendados no pg_cron" ($cron -match 'hd-descarte-anexos' -and $cron -match 'hd-retencao-diaria') $cron

Write-Host ""
if ($falhas -eq 0) { Write-Host "TODAS AS VERIFICACOES PASSARAM" -ForegroundColor Green }
else { Write-Host "$falhas VERIFICACAO(ES) FALHARAM" -ForegroundColor Red }
exit $falhas
