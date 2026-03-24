param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$resolvedSourcePath = (Resolve-Path -LiteralPath $SourcePath).Path
$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutputPath

if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$powerPoint = $null
$presentation = $null

try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $powerPoint.Visible = -1

  $presentation = $powerPoint.Presentations.Open($resolvedSourcePath, $true, $false, $false)
  $ppSaveAsPDF = 32
  $presentation.SaveAs($resolvedOutputPath, $ppSaveAsPDF)
}
finally {
  if ($presentation) {
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }

  if ($powerPoint) {
    $powerPoint.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
