#   powershell -File countryBuilder.ps1 "C:\Users\{user}\Documents\Warcraft III\CustomMapData\risk"

param (
    [Parameter(Mandatory = $true)]
    [string]$TargetDir
)

if (-not (Test-Path $TargetDir -PathType Container)) {
    Write-Error "Not a directory: $TargetDir"
    exit 1
}

function Strip-Preloads {
    param (
        [string]$Content
    )

    # Matches: call Preload( "..." )
    # Handles escaped quotes \" and escaped backslashes \\
    $regex = [regex]'call\s+Preload\(\s*"((?:\\.|[^"\\])*)"\s*\)\s*'

    $matches = $regex.Matches($Content)
    if ($matches.Count -eq 0) {
        return $Content
    }

    $sb = New-Object System.Text.StringBuilder
    foreach ($m in $matches) {
        [void]$sb.Append($m.Groups[1].Value)
    }

    return $sb.ToString()
}

# Extensions treated as text
$textExtensions = @(
    '.txt', '.j', '.js', '.ts', '.lua', '.json', '.cfg', '.ini'
)

Get-ChildItem -Path $TargetDir -Recurse -File |
Where-Object { $textExtensions -contains $_.Extension.ToLower() } |
ForEach-Object {
    $file = $_.FullName
    $original = Get-Content $file -Raw -Encoding UTF8
    $stripped = Strip-Preloads $original

    if ($stripped -ne $original) {
        Set-Content -Path $file -Value $stripped -Encoding UTF8
        Write-Host "Updated: $file"
    }
}
