# HistoricoDrive - seed do banco (dev/QA).
# Uso: . .\scripts\supabase.ps1 ; . .\scripts\seed.ps1
# Idempotente: usuarios ja existentes sao aproveitados.
# As senhas vem de .env (SEED_SENHA_*) e nunca ficam no codigo.

$env = Get-HdEnv
$base = $env['NEXT_PUBLIC_SUPABASE_URL']
$secret = $env['SUPABASE_SECRET_KEY']

function Novo-Usuario {
  param([string]$Email, [string]$Senha, [string]$Nome)
  $headers = @{ apikey = $secret; Authorization = "Bearer $secret"; 'Content-Type' = 'application/json' }
  $body = @{ email = $Email; password = $Senha; email_confirm = $true } | ConvertTo-Json
  try {
    $r = Invoke-RestMethod -Uri "$base/auth/v1/admin/users" -Method POST -Headers $headers -Body $body
    return $r.id
  }
  catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $msg = $_.ErrorDetails.Message
      if (-not $msg) { $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $msg = $sr.ReadToEnd() }
      if ($msg -match 'already' -or $msg -match 'email_exists') {
        $q = [uri]::EscapeDataString($Email)
        $lista = Invoke-RestMethod -Uri "$base/auth/v1/admin/users?page=1&per_page=200" -Method GET -Headers @{ apikey = $secret; Authorization = "Bearer $secret" }
        $u = $lista.users | Where-Object { $_.email -eq $Email } | Select-Object -First 1
        if ($u) { return $u.id }
      }
      throw "auth/admin/users -> $([int]$resp.StatusCode): $msg"
    }
    throw $_.Exception.Message
  }
}

$senhas = @{}
foreach ($par in @(
    @('admin@historicodrive.app', 'SEED_SENHA_ADMIN'),
    @('dono.central@historicodrive.app', 'SEED_SENHA_CENTRAL'),
    @('dono.vianorte@historicodrive.app', 'SEED_SENHA_VIANORTE')
  )) {
  $senha = $env[$par[1]]
  if (-not $senha) { throw "$($par[1]) ausente no .env (ver .env.example)" }
  $senhas[$par[0]] = $senha
}

$ids = @{}
foreach ($e in $senhas.Keys) { $ids[$e] = Novo-Usuario -Email $e -Senha $senhas[$e] -Nome $e }
"usuarios: $($ids.Count)"

$admin = $ids['admin@historicodrive.app']
$central = $ids['dono.central@historicodrive.app']
$vianorte = $ids['dono.vianorte@historicodrive.app']

$sql = @"
insert into perfil (id, nome, papel, locadora_ativa)
values ('$admin', 'Superadmin', 'superadmin', null)
on conflict (id) do update set papel = 'superadmin';

insert into locadora (id, nome, cnpj, cidade, uf, email_contato, status, receber_da_rede)
values ('11111111-1111-1111-1111-111111111111', 'Locadora Central', '11222333000181', 'Curitiba', 'PR',
        'contato@locadoracentral.com', 'aprovada', true)
on conflict (id) do update
  set status = excluded.status,
      receber_da_rede = excluded.receber_da_rede,
      motivo_recusa = null,
      aprovado_em = null,
      aprovado_por = null;

insert into locadora (id, nome, cnpj, cidade, uf, email_contato, status, receber_da_rede)
values ('22222222-2222-2222-2222-222222222222', 'Auto Via Norte', '44555666000109', 'Londrina', 'PR',
        'contato@autovianorte.com', 'aprovada', true)
on conflict (id) do update
  set status = excluded.status,
      receber_da_rede = excluded.receber_da_rede,
      motivo_recusa = null,
      aprovado_em = null,
      aprovado_por = null;

insert into locadora (id, nome, cnpj, cidade, uf, email_contato, status, criado_por)
values ('33333333-3333-3333-3333-333333333333', 'Pendente Exemplo Ltda', null, 'Maringa', 'PR',
        'fale@pendenteexemplo.com', 'pendente', '$admin')
on conflict (id) do update
  set status = excluded.status,
      receber_da_rede = excluded.receber_da_rede,
      motivo_recusa = null,
      aprovado_em = null,
      aprovado_por = null;

insert into perfil (id, nome, papel, locadora_ativa) values ('$central', 'Dono Central', 'dono', null)
on conflict (id) do update set nome = excluded.nome;
insert into perfil (id, nome, papel, locadora_ativa) values ('$vianorte', 'Dono Via Norte', 'dono', null)
on conflict (id) do update set nome = excluded.nome;

insert into perfil_locadora (perfil_id, locadora_id)
values ('$central', '11111111-1111-1111-1111-111111111111'),
       ('$vianorte', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

update perfil set locadora_ativa = '11111111-1111-1111-1111-111111111111' where id = '$central';
update perfil set locadora_ativa = '22222222-2222-2222-2222-222222222222' where id = '$vianorte';

insert into motorista (id, cpf, nome_completo, nascimento)
values ('aaaaaaa1-0000-4000-8000-000000000001', '39053344705', 'Joana Pereira da Silva', '1990-04-12'),
       ('aaaaaaa1-0000-4000-8000-000000000002', '18456732900', 'Carlos Eduardo Souza', '1985-11-03'),
       ('aaaaaaa1-0000-4000-8000-000000000003', '52998224725', 'Maria Aparecida Lima', '1993-07-21')
on conflict (id) do nothing;

insert into incidente (id, motorista_id, locadora_id, placa, tipo, valor, descricao, estado, confianca, criado_por, criado_em)
values
  ('bbbbbbb1-0000-4000-8000-000000000001', 'aaaaaaa1-0000-4000-8000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'ABC1D23', 'dano_veiculo', 2450.00,
   'Retrovisor direito arrombado e pintura arranhada na porta do passageiro.',
   'confirmado', 'alta', '$central', now() - interval '40 days'),
  ('bbbbbbb1-0000-4000-8000-000000000002', 'aaaaaaa1-0000-4000-8000-000000000002',
   '11111111-1111-1111-1111-111111111111', 'XYZ-9876', 'nao_devolucao', 900.00,
   'Veiculo nao devolvido na data combinada; localizado 6 dias depois.',
   'suspeita', 'media', '$central', now() - interval '9 days'),
  ('bbbbbbb1-0000-4000-8000-000000000003', 'aaaaaaa1-0000-4000-8000-000000000001',
   '22222222-2222-2222-2222-222222222222', 'QWE4E56', 'uso_indevido', 350.00,
   'Veiculo utilizado fora da cidade declarada no contrato de locacao.',
   'contestado', 'baixa', '$vianorte', now() - interval '2 days'),
  ('bbbbbbb1-0000-4000-8000-000000000004', 'aaaaaaa1-0000-4000-8000-000000000003',
   '11111111-1111-1111-1111-111111111111', 'JKL8J90', 'fraude_documental', 1800.00,
   'Apresentou CNH com foto adulterada na retirada do veiculo.',
   'confirmado', 'alta', '$central', now() - interval '5 days')
on conflict (id) do update
  set estado = excluded.estado,
      confianca = excluded.confianca,
      motivo = null,
      atualizado_em = now();

insert into audit_log (locadora_id, ator, acao, alvo_tipo, alvo_id, depois)
select locadora_id, criado_por, 'incidente.criar', 'incidente', id,
       jsonb_build_object('estado', estado, 'seed', true)
  from incidente where id::text like 'bbbbbbb1-%'
    and not exists (select 1 from audit_log a where a.alvo_id = incidente.id);
"@

$r = Invoke-HdSql -Sql $sql
"seed sql ok: $(@($r).Count) linhas"

