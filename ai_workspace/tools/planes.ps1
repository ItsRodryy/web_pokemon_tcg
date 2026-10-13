param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Estado", "Archivar", "Podar")]
    [string]$Accion,

    [ValidateSet("BORRADOR", "APROBADO", "EN CURSO", "BLOQUEADO", "COMPLETADO", "INCOMPLETO")]
    [string]$Estado,

    [string]$Raiz = "",
    [int]$Conservar = 5
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0
$estadosArchivo = @("COMPLETADO", "INCOMPLETO")

if (-not $Raiz) {
    $Raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
}
if (-not (Test-Path -LiteralPath $Raiz -PathType Container)) {
    throw "No existe la raíz del proyecto: $Raiz"
}
if ($Conservar -lt 1) {
    throw "Debe conservarse al menos un plan"
}

$Raiz = (Resolve-Path -LiteralPath $Raiz).Path
$plan = Join-Path $Raiz "PLAN_ACTUAL.md"
$archivo = Join-Path $Raiz "ai_workspace\archivo\planes"

function Leer-Plan {
    if (-not (Test-Path -LiteralPath $plan -PathType Leaf)) {
        throw "No existe PLAN_ACTUAL.md en $Raiz"
    }
    return [IO.File]::ReadAllText($plan, [Text.Encoding]::UTF8)
}

function Escribir-Atomico([string]$Ruta, [string]$Contenido) {
    $carpeta = Split-Path -Parent $Ruta
    if (-not (Test-Path -LiteralPath $carpeta)) {
        New-Item -ItemType Directory -Path $carpeta -Force | Out-Null
    }
    $temporal = "$Ruta.tmp"
    [IO.File]::WriteAllText($temporal, $Contenido, (New-Object Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $temporal -Destination $Ruta -Force
}

function Con-Estado([string]$Contenido, [string]$NuevoEstado) {
    $linea = "> **Estado:** $NuevoEstado"
    if ($Contenido -match '(?m)^> \*\*Estado:\*\* .+$') {
        return [regex]::Replace($Contenido, '(?m)^> \*\*Estado:\*\* .+$', $linea, 1)
    }
    $lineas = @($Contenido -split "`r?`n")
    $posicion = if ($lineas.Count -gt 0 -and $lineas[0] -like '# *') { 1 } else { 0 }
    $antes = if ($posicion -gt 0) { @($lineas[0..($posicion - 1)]) } else { @() }
    $despues = if ($posicion -lt $lineas.Count) { @($lineas[$posicion..($lineas.Count - 1)]) } else { @() }
    return ((@($antes) + @('', $linea) + $despues) -join "`n").TrimEnd() + "`n"
}

function Obtener-Slug([string]$Contenido) {
    $titulo = "plan"
    foreach ($linea in ($Contenido -split "`r?`n")) {
        if ($linea -like '# *') {
            $titulo = $linea.Substring(2).Trim()
            break
        }
    }
    $normalizado = $titulo.Normalize([Text.NormalizationForm]::FormD)
    $sinTildes = -join ($normalizado.ToCharArray() | Where-Object {
        [Globalization.CharUnicodeInfo]::GetUnicodeCategory($_) -ne
            [Globalization.UnicodeCategory]::NonSpacingMark
    })
    $slug = ([regex]::Replace($sinTildes, '[^a-zA-Z0-9]+', '-')).Trim('-').ToLowerInvariant()
    if (-not $slug) { $slug = "plan" }
    if ($slug.Length -gt 60) { $slug = $slug.Substring(0, 60).TrimEnd('-') }
    return $slug
}

function Podar-Planes {
    if (-not (Test-Path -LiteralPath $archivo -PathType Container)) { return }
    $planes = @(Get-ChildItem -LiteralPath $archivo -File -Filter "*.md" |
        Sort-Object LastWriteTimeUtc, Name)
    $cantidad = $planes.Count - $Conservar
    if ($cantidad -gt 0) {
        foreach ($ruta in $planes[0..($cantidad - 1)]) {
            Remove-Item -LiteralPath $ruta.FullName -Force
            Write-Output "ELIMINADO $($ruta.FullName)"
        }
    }
}

switch ($Accion) {
    "Estado" {
        if (-not $Estado) { throw "Estado es obligatorio para la acción Estado" }
        Escribir-Atomico $plan (Con-Estado (Leer-Plan) $Estado)
        Write-Output "ESTADO $Estado"
    }
    "Archivar" {
        if ($Estado -notin $estadosArchivo) {
            throw "Solo se archivan planes COMPLETADOS o INCOMPLETOS"
        }
        $contenido = Con-Estado (Leer-Plan) $Estado
        if (-not (Test-Path -LiteralPath $archivo)) {
            New-Item -ItemType Directory -Path $archivo -Force | Out-Null
        }
        $base = "{0}_{1}_{2}" -f (Get-Date -Format "yyyy-MM-dd"), (Obtener-Slug $contenido), $Estado
        $destino = Join-Path $archivo "$base.md"
        $numero = 2
        while (Test-Path -LiteralPath $destino) {
            $destino = Join-Path $archivo ("{0}_{1}.md" -f $base, $numero)
            $numero++
        }
        Escribir-Atomico $destino $contenido
        $sha = [Security.Cryptography.SHA256]::Create()
        try {
            $esperado = ([BitConverter]::ToString($sha.ComputeHash(
                (New-Object Text.UTF8Encoding($false)).GetBytes($contenido)))).Replace('-', '')
        }
        finally {
            $sha.Dispose()
        }
        if ((Get-FileHash -Algorithm SHA256 -LiteralPath $destino).Hash -ne $esperado) {
            throw "No se pudo verificar el plan archivado"
        }
        Remove-Item -LiteralPath $plan -Force
        Write-Output "ARCHIVADO $destino"
        Podar-Planes
    }
    "Podar" { Podar-Planes }
}
