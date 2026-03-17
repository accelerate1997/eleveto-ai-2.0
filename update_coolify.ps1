$headers = @{
    "Authorization" = "Bearer TSYU03K2BFZPC7TOuJYwQrrZvHfp2s9ugEqYrrUo887bca87"
    "Content-Type" = "application/json"
}

$appUuid = "rcww8o0o8wo8848oskg44wgs"
$baseUrl = "http://31.97.231.139:8000/api/v1"

# 1. Update Domains
$domainPatch = @{
    docker_compose_domains = '{"frontend":{"domain":"https://elevetoai.com"},"backend":{"domain":"https://api-eleveto.31.97.231.139.sslip.io"}}'
} | ConvertTo-Json -Compress

Write-Host "Updating Domains..."
Invoke-RestMethod -Uri "$baseUrl/applications/$appUuid" -Method Patch -Headers $headers -Body $domainPatch

# 2. Add VITE_API_URL
$env1 = @{
    key = "VITE_API_URL"
    value = "https://api-eleveto.31.97.231.139.sslip.io"
    is_buildtime = $true
} | ConvertTo-Json -Compress

Write-Host "Adding VITE_API_URL..."
Invoke-RestMethod -Uri "$baseUrl/applications/$appUuid/envs" -Method Post -Headers $headers -Body $env1

# 3. Add ALLOWED_ORIGINS
$env2 = @{
    key = "ALLOWED_ORIGINS"
    value = "https://elevetoai.com,https://api-eleveto.31.97.231.139.sslip.io"
    is_buildtime = $false
} | ConvertTo-Json -Compress

Write-Host "Adding ALLOWED_ORIGINS..."
Invoke-RestMethod -Uri "$baseUrl/applications/$appUuid/envs" -Method Post -Headers $headers -Body $env2
