# Histórico — aplica as migrations de supabase/migrations/ no projeto remoto.
# Cada arquivo e aplicado uma unica vez; o controle fica em
# public._migrations_aplicadas no proprio banco.
# Uso: . .\scripts\supabase.ps1 ; . .\scripts\aplicar-migrations.ps1

Invoke-HdSql -Sql @"
create table if not exists public._migrations_aplicadas (
  version text primary key,
  nome text not null,
  aplicado_em timestamptz not null default now()
);
alter table public._migrations_aplicadas enable row level security;
revoke all on public._migrations_aplicadas from anon, authenticated;
"@ | Out-Null

$aplicadas = @{}
$linhas = Invoke-HdSql -Sql "select version from public._migrations_aplicadas"
foreach ($l in @($linhas)) {
  if ($l.version) { $aplicadas[$l.version] = $true }
}

$pasta = Join-Path $script:HdRoot "supabase\migrations"
$arquivos = Get-ChildItem -LiteralPath $pasta -Filter *.sql | Sort-Object Name

$total = 0
foreach ($f in $arquivos) {
  $version = $f.BaseName.Split('_')[0]
  if ($aplicadas.ContainsKey($version)) {
    Write-Host "  pula   $($f.Name)" -ForegroundColor DarkGray
    continue
  }
  $sql = [IO.File]::ReadAllText($f.FullName, [Text.Encoding]::UTF8)
  try {
    Invoke-HdSql -Sql $sql | Out-Null
    Invoke-HdSql -Sql "insert into public._migrations_aplicadas (version, nome) values ('$version', '$($f.Name)')" | Out-Null
    Write-Host "  aplica $($f.Name)" -ForegroundColor Green
    $total++
  }
  catch {
    Write-Host "  ERRO   $($f.Name): $($_.Exception.Message)" -ForegroundColor Red
    exit 1
  }
}

Write-Host "$total migration(ns) aplicada(s), $($arquivos.Count) no total."
