# Histórico — guarda no Vault a URL e a chave de serviço usadas pelo job
# hd-descarte-anexos (processar_descarte_anexos) para apagar arquivos
# expurgados pela Storage API. A chave nunca é impressa.
# Uso: . .\scripts\supabase.ps1 ; . .\scripts\configurar-descarte.ps1

$envHd = Get-HdEnv
$url = ([string]$envHd['VITE_SUPABASE_URL']).Trim()
if (-not $url) { throw "VITE_SUPABASE_URL ausente no .env" }

# SUPABASE_SECRET_KEY do .env tem prioridade (chave sb_secret_ nova
# volta mascarada pela API de gerenciamento)
$chave = ([string]$envHd['SUPABASE_SECRET_KEY']).Trim()
$origem = '.env'
if (-not $chave) {
  $chaves = @(Invoke-HdApi -Path "/api-keys?reveal=true")
  $servico = $chaves | Where-Object { $_.name -eq 'service_role' -and $_.api_key } | Select-Object -First 1
  if (-not $servico) {
    $servico = $chaves | Where-Object { $_.type -eq 'secret' -and $_.api_key } | Select-Object -First 1
  }
  if (-not $servico) { throw "nenhuma chave de servico encontrada no projeto" }
  $chave = ([string]$servico.api_key).Trim()
  $origem = $servico.name
}
if ($chave -notmatch '^[A-Za-z0-9._-]+$') {
  throw "formato de chave inesperado: confira SUPABASE_SECRET_KEY no .env"
}
if ($url -notmatch '^https://[A-Za-z0-9.-]+/?$') { throw "formato de URL inesperado" }

function Set-HdSegredo([string]$nome, [string]$valor, [string]$descricao) {
  Invoke-HdSql -Sql @"
do `$`$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = '$nome';
  if v_id is null then
    perform vault.create_secret('$valor', '$nome', '$descricao');
  else
    perform vault.update_secret(v_id, '$valor', '$nome', '$descricao');
  end if;
end
`$`$;
"@ | Out-Null
}

Set-HdSegredo 'hd_supabase_url' $url 'URL do projeto para a Storage API'
Set-HdSegredo 'hd_service_role_key' $chave 'chave de servico do descarte de anexos'
$chave = $null

Write-Host "Vault configurado (chave de $origem). O job hd-descarte-anexos passa a apagar os arquivos expurgados." -ForegroundColor Green
