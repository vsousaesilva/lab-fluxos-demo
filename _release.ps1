#requires -Version 7.0
<#
.SYNOPSIS
  Orquestrador de release do lab-fluxos-demo.

.DESCRIPTION
  Executa o fluxo de release deploy-first (bump SO depois do deploy ok):
    1) commit das mudancas pendentes (se houver)
    2) git push origin main         (sem tag ainda)
    3) opennextjs-cloudflare build && deploy   <- teste de fogo
    4) npm version <bump>           (so se 3 passou)
       git push origin main --follow-tags

  Se o deploy (passo 3) falhar, NENHUM bump e' feito. Voce corrige o codigo
  e roda de novo — sem inflar a versao por causa de build quebrado.

  Espera que _release.cmd ja tenha colocado os portateis no PATH:
    - git    (PortableGit)
    - node, npm (Node 24)

.PARAMETER Bump
  Tipo de bump: patch | minor | major. Default: patch.

.PARAMETER Message
  Mensagem do commit das mudancas pendentes. Se vazia E houver mudancas,
  o script falha (commit precisa de mensagem). Se nao houver mudancas
  pendentes, a mensagem e ignorada.

.EXAMPLE
  _release.cmd patch "fix: contador do painel bate com /revisao"

.EXAMPLE
  _release.cmd minor "feat: sistema de convites"
#>

[CmdletBinding()]
param(
    [ValidateSet('patch','minor','major')]
    [string]$Bump = 'patch',

    [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

# Caminho absoluto do git portatil - nao depender de PATH/wrapper
$Git = 'C:\Portatil\PortableGit\cmd\git.exe'
if (-not (Test-Path $Git)) {
    throw "Git portatil nao encontrado em $Git"
}

# Limpar env vars que confundem git (descoberta automatica do repo)
Remove-Item Env:GIT_DIR -ErrorAction SilentlyContinue
Remove-Item Env:GIT_WORK_TREE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_INDEX_FILE -ErrorAction SilentlyContinue
Remove-Item Env:GIT_OBJECT_DIRECTORY -ErrorAction SilentlyContinue

# Sanity check - precisamos estar dentro de um repo git
if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
    throw "Pasta '.git' nao encontrada em $ProjectRoot - rode _git-init-push.cmd primeiro."
}

# Diagnostico inicial
Write-Host ''
Write-Host '--- diagnostico ---' -ForegroundColor DarkGray
Write-Host ("  CWD     : {0}" -f (Get-Location).Path)
Write-Host ("  git     : {0}" -f (& $Git --version))
Write-Host ("  node    : {0}" -f (& node --version))
Write-Host ("  npm     : {0}" -f (& npm --version))
Write-Host ('-' * 60) -ForegroundColor DarkGray

# ---------- helpers ----------------------------------------------------------

function Write-Step {
    param([int]$N, [int]$Total, [string]$Title)
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
    Write-Host (" [{0}/{1}] {2}" -f $N, $Total, $Title) -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor DarkCyan
}

function Write-Ok    { param([string]$Msg) Write-Host "  OK  $Msg" -ForegroundColor Green }
function Write-Info  { param([string]$Msg) Write-Host "  -   $Msg" -ForegroundColor Gray }
function Write-Warn  { param([string]$Msg) Write-Host "  !   $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "  X   $Msg" -ForegroundColor Red }

function Invoke-Native {
    <# Roda um executavel nativo. Falha se exit != 0. Captura stdout (stderr fica visivel). #>
    param(
        [Parameter(Mandatory)] [string]$File,
        [string[]]$Arguments,
        [switch]$Quiet
    )
    if ($Quiet) {
        $out = & $File @Arguments 2>&1
    } else {
        & $File @Arguments
        $out = $null
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Comando '$File $($Arguments -join ' ')' falhou com exit $LASTEXITCODE"
    }
    return $out
}

function Get-PackageVersion {
    (Get-Content (Join-Path $ProjectRoot 'package.json') -Raw | ConvertFrom-Json).version
}

# ---------- inicio -----------------------------------------------------------

$startTime = Get-Date

$currentVersion = Get-PackageVersion
Write-Host ''
Write-Host 'Release lab-fluxos-demo' -ForegroundColor White
Write-Host "  versao atual : v$currentVersion"
Write-Host "  bump         : $Bump"
Write-Host "  msg (commit) : $(if ($Message) { $Message } else { '(nenhuma — sem mudancas pendentes)' })"

# NOVA ORDEM (deploy primeiro, bump por último — evita tags órfãs):
#   1/4 commit (sem bump)
#   2/4 push do commit
#   3/4 build + deploy   ← se falhar, NADA bumpado
#   4/4 npm version <bump> + push --follow-tags

# ---------- 1/4: commit das mudancas pendentes -------------------------------

Write-Step 1 4 'commit das mudancas pendentes'

$dirty = & $Git status --porcelain
$preReleaseSha = (& $Git rev-parse HEAD).Trim()
$hadChanges = -not [string]::IsNullOrWhiteSpace($dirty)

if (-not $hadChanges) {
    Write-Info 'Working tree limpa, nada a commitar.'
} else {
    if ([string]::IsNullOrWhiteSpace($Message)) {
        Write-Err 'Ha mudancas pendentes mas nenhuma mensagem foi passada.'
        Write-Host ''
        Write-Host $dirty -ForegroundColor DarkGray
        throw 'Mensagem de commit obrigatoria quando ha mudancas pendentes.'
    }

    # Branch precisa ser main
    $branch = (& $Git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne 'main') {
        throw "Branch atual e '$branch', mas releases saem so de 'main'. Aborte e ajuste."
    }

    # Detectar arquivos sensiveis que possam ter escapado
    $sensitive = @('.dev.vars', '.cf-token', '.env', '.env.local')
    $leak = $dirty -split "`n" | Where-Object {
        $line = $_.Trim()
        foreach ($s in $sensitive) {
            if ($line -match "(?i)\s$([regex]::Escape($s))(\s|$)") { return $true }
        }
        $false
    }
    if ($leak) {
        Write-Err 'Arquivos sensiveis detectados no staging:'
        $leak | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
        throw '.gitignore precisa cobrir esses arquivos. Aborte.'
    }

    Write-Info 'git add .'
    & $Git add .
    if ($LASTEXITCODE -ne 0) { throw 'git add falhou.' }

    Write-Info "git commit -m `"$Message`""
    & $Git commit -m $Message
    if ($LASTEXITCODE -ne 0) { throw 'git commit falhou.' }

    Write-Ok 'Commit das mudancas pendentes feito.'
}

# ---------- 2/4: push do commit (sem tag, ainda) ----------------------------

Write-Step 2 4 'git push origin main (sem tag ainda)'

if ($hadChanges) {
    & $Git push origin main
    if ($LASTEXITCODE -ne 0) {
        throw 'git push falhou (commit do codigo). Resolva e rode novamente.'
    }
    Write-Ok 'Commit do codigo enviado para GitHub.'
} else {
    Write-Info 'Sem novo commit pra enviar.'
}

# ---------- 3/4: deploy Cloudflare ------------------------------------------

Write-Step 3 4 'opennextjs-cloudflare build && deploy'

Write-Info 'Build pode demorar 1-3 min...'
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Err 'Deploy falhou. NENHUM bump foi feito — corrija o erro e rode novamente.'
    Write-Warn 'Estado atual:'
    Write-Host "    HEAD em : $(& $Git rev-parse --short HEAD) (commit pushado, sem tag)"
    Write-Host "    Pre-rel : $($preReleaseSha.Substring(0,7))"
    throw 'Deploy falhou.'
}
Write-Ok 'Deploy concluido em producao.'

# ---------- 4/4: npm version (bump + commit + tag) + push tag ---------------

Write-Step 4 4 "npm version $Bump (so depois do deploy ok)"

Write-Info 'Bumping package.json e criando tag...'
npm version $Bump -m "release: v%s"
if ($LASTEXITCODE -ne 0) { throw "npm version $Bump falhou." }

$newVersion = Get-PackageVersion
$tag = "v$newVersion"
Write-Ok "Nova versao: $tag"

Write-Info 'git push origin main --follow-tags'
& $Git push origin main --follow-tags
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Push da tag $tag falhou — deploy ja foi mas tag ficou local. Tente: git push origin main --follow-tags"
    throw 'git push --follow-tags falhou.'
}
Write-Ok "Tag $tag enviada para GitHub."

# ---------- sumario ----------------------------------------------------------

$elapsed = (Get-Date) - $startTime
$mins = [int]$elapsed.TotalMinutes
$secs = $elapsed.Seconds

Write-Host ''
Write-Host ('=' * 60) -ForegroundColor Green
Write-Host ' RELEASE CONCLUIDO' -ForegroundColor Green
Write-Host ('=' * 60) -ForegroundColor Green
Write-Host ("  Versao    : $tag")
Write-Host ("  Tempo     : {0}m{1}s" -f $mins, $secs)
Write-Host  '  GitHub    : https://github.com/vsousaesilva/lab-fluxos-demo'
Write-Host ("             tag: https://github.com/vsousaesilva/lab-fluxos-demo/releases/tag/$tag")
Write-Host  '  Producao  : https://labdefluxos.com.br'
Write-Host ('=' * 60) -ForegroundColor Green
Write-Host ''

exit 0
