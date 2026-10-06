# Helper da API Supabase do Historico (PowerShell 5.1).
# Uso:  . .\scripts\supabase.ps1 ; Invoke-HdSql "select 1"

$script:HdRef = "alrplsstgjahwawtnbmt"
$script:HdRoot = Split-Path -Parent $PSScriptRoot
$script:HdEnvFile = Join-Path $script:HdRoot ".env"

function Get-HdEnv {
  $map = @{}
  if (Test-Path -LiteralPath $script:HdEnvFile) {
    Get-Content -LiteralPath $script:HdEnvFile -Encoding UTF8 |
      Where-Object { $_ -match '^\s*[^#=\s]+\s*=' } |
      ForEach-Object {
        $k, $v = $_.Split("=", 2)
        $map[$k.Trim()] = $v.Trim()
      }
  }
  return $map
}

function Set-HdEnv {
  param([hashtable]$Pairs)
  $map = Get-HdEnv
  foreach ($k in $Pairs.Keys) { $map[$k] = $Pairs[$k] }
  $linhas = foreach ($k in ($map.Keys | Sort-Object)) { "$k=$($map[$k])" }
  Set-Content -LiteralPath $script:HdEnvFile -Value $linhas -Encoding UTF8
}

function Get-HdToken {
  $map = Get-HdEnv
  $t = $map["SUPABASE_ACCESS_TOKEN"]
  if (-not $t) { $t = $map["SUPABASE_TOKEN"] }
  if (-not $t) { throw "SUPABASE_ACCESS_TOKEN ausente no .env" }
  return $t
}

function Invoke-HdApi {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [string]$Body
  )
  $uri = "https://api.supabase.com/v1/projects/$script:HdRef$Path"
  $h = @{ Authorization = "Bearer $(Get-HdToken)" }
  $params = @{ Uri = $uri; Headers = $h; Method = $Method }
  if ($Body) {
    $h["Content-Type"] = "application/json"
    $params["Body"] = $Body
  }
  try {
    return Invoke-RestMethod @params
  }
  catch {
    $resp = $_.Exception.Response
    $msg = $_.ErrorDetails.Message
    if (-not $msg -and $resp) {
      $sr = New-Object IO.StreamReader($resp.GetResponseStream())
      $msg = $sr.ReadToEnd()
    }
    if ($resp) { throw "API $Method $Path -> $($resp.StatusCode.value__): $msg" }
    throw "API $Method $Path -> $($_.Exception.Message)"
  }
}

function Invoke-HdSql {
  param([string]$Sql)
  $payload = @{ query = $Sql } | ConvertTo-Json
  return Invoke-HdApi -Method POST -Path "/database/query" -Body $payload
}

function Get-HdTableList {
  return Invoke-HdSql -Sql "select table_schema, table_name from information_schema.tables where table_schema in ('public','storage') order by 1,2"
}
