$url = "https://colizo.app/search?date=2026-07-20T16:00:00.000Z&maxPrice=97000&maxWeight=13"
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing
    Write-Output $response.Content
} catch {
    Write-Output "ERREUR: $($_.Exception.Message)"
}
