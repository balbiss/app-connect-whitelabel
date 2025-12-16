# ============================================
# TESTAR CONEXÃO COM REDIS
# ============================================

Write-Host "🔍 Testando conexão com Redis..." -ForegroundColor Cyan
Write-Host ""

# Carregar .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    exit 1
}

$redisHost = $env:REDIS_HOST
$redisPort = $env:REDIS_PORT
$redisPassword = $env:REDIS_PASSWORD

Write-Host "📋 Configuração:" -ForegroundColor Yellow
Write-Host "   Host: $redisHost" -ForegroundColor White
Write-Host "   Port: $redisPort" -ForegroundColor White
Write-Host "   Password: $(if ($redisPassword) { '***' } else { 'não configurada' })" -ForegroundColor White
Write-Host ""

# Testar usando Node.js
$testScript = @"
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Parar após 3 tentativas
    }
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  console.log('✅ Redis conectado!');
});

redis.on('error', (err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

redis.ping()
  .then((result) => {
    console.log('✅ PING resposta:', result);
    console.log('✅ Conexão funcionando perfeitamente!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro ao fazer PING:', err.message);
    process.exit(1);
  });
"@

$testScript | Out-File -FilePath "test-redis-temp.mjs" -Encoding utf8

Write-Host "🔄 Executando teste..." -ForegroundColor Yellow
Write-Host ""

node test-redis-temp.mjs

$result = $LASTEXITCODE

Remove-Item "test-redis-temp.mjs" -ErrorAction SilentlyContinue

if ($result -eq 0) {
    Write-Host ""
    Write-Host "✅ REDIS CONFIGURADO CORRETAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Agora você pode iniciar o middleware:" -ForegroundColor Cyan
    Write-Host "   npm start      (API)" -ForegroundColor White
    Write-Host "   npm run worker (Worker)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ ERRO NA CONEXÃO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verifique:" -ForegroundColor Yellow
    Write-Host "   - Host está correto?" -ForegroundColor White
    Write-Host "   - Port está correta?" -ForegroundColor White
    Write-Host "   - Password está correta?" -ForegroundColor White
    Write-Host "   - Firewall permite conexão?" -ForegroundColor White
}

exit $result

