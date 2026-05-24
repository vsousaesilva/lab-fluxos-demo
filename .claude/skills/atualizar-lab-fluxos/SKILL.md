---
name: atualizar-lab-fluxos
description: Release end-to-end do lab-fluxos-demo. Use quando o usuário pedir "atualizar lab-fluxos", "fazer release do lab-fluxos", "deployar lab-fluxos", "subir lab-fluxos pra produção" ou similar. Faz bump de versão, commit + push para GitHub e deploy para Cloudflare Workers numa única passada.
---

# Atualizar Lab Fluxos (release end-to-end)

Orquestra um release completo do projeto `lab-fluxos-demo` (em `C:\dev\lab-fluxos-demo`).

## Arquitetura do release

```
_release.cmd  (thin wrapper)
   |
   | 1) valida os 3 portateis em C:\Portatil
   | 2) adiciona node + git ao PATH
   | 3) carrega .cf-token (se houver)
   | 4) chama o orquestrador:
   v
_release.ps1  (PowerShell 7, faz o trabalho real)
   |
   |-- [1/4] commit das mudancas pendentes (valida branch=main, anti-leak de secrets)
   |-- [2/4] npm version <bump>   -> commit "release: vX.Y.Z" + tag vX.Y.Z
   |-- [3/4] git push origin main --follow-tags
   `-- [4/4] npm run deploy       -> opennextjs-cloudflare build && deploy
```

## Portáteis usados (todos em `C:\Portatil`)

| Tool          | Caminho                                                    |
|---------------|------------------------------------------------------------|
| Git           | `C:\Portatil\PortableGit\cmd\git.exe`                      |
| Node 24       | `C:\Portatil\node-v24.14.1-win-x64\node.exe` (+ `npm.cmd`) |
| PowerShell 7  | `C:\Portatil\PowerShell-7.6.1-win-x64\pwsh.exe`            |

O `_release.cmd` valida os 3 e aborta com mensagem clara se algum estiver faltando.

## Como invocar a partir do agente

### Passo 1 — diagnóstico

Antes de tudo, mostre ao usuário:
- **Versão atual**: leia de `package.json` (`(Get-Content package.json | ConvertFrom-Json).version`)
- **Branch atual** + **status `--short`** + **últimos 5 commits**

Comando único via pwsh:

```powershell
& "C:\Portatil\PowerShell-7.6.1-win-x64\pwsh.exe" -NoLogo -NoProfile -Command @'
  $g = "C:\Portatil\PortableGit\cmd\git.exe"
  Set-Location "C:\dev\lab-fluxos-demo"
  Write-Host "branch  :" (& $g rev-parse --abbrev-ref HEAD)
  Write-Host "version :" ((Get-Content package.json -Raw | ConvertFrom-Json).version)
  Write-Host "--- status ---"
  & $g status --short
  Write-Host "--- last 5 commits ---"
  & $g log --oneline -5
'@
```

### Passo 2 — perguntar ao usuário (AskUserQuestion)

Duas perguntas obrigatórias:

1. **Tipo de bump**: `patch` (default) / `minor` / `major`. Calcule e mostre a próxima versão em cada opção (ex.: `patch → v0.1.1`, `minor → v0.2.0`).

2. **Mensagem do commit**: gere 2-3 sugestões a partir dos arquivos modificados detectados em `git status`. Sempre inclua "Other" pra digitação livre.

Casos especiais:
- **Working tree limpa**: pergunte se é só re-deploy. Se sim, rode só `npm run deploy` (não `_release.cmd`).
- **Branch ≠ main**: pare. Releases saem só de `main`.
- **Arquivos sensíveis** (`.dev.vars`, `.cf-token`, `.env.local`) em staging: pare e avise — o `.gitignore` falhou.

### Passo 3 — migrations novas

Verifique se há arquivo em `drizzle/migrations/` mais novo que o último aplicado (compare timestamps ou nomes ordenados). Se houver e o usuário não rodou `_db-migrate-remote.cmd` desde a última, **avise** e ofereça rodar antes do release.

### Passo 4 — executar o release

```powershell
& "C:\dev\lab-fluxos-demo\_release.cmd" <patch|minor|major> "<msg>"
```

- **Timeout do tool**: 600000ms (10 min). Build do OpenNext costuma demorar 1-3 min.
- **NÃO** rode em background — release é destrutivo, espere o exit code.
- **NÃO** tente re-executar automaticamente se falhar.

O `_release.ps1` é defensivo:
- Falha cedo se branch ≠ main
- Bloqueia push de arquivos sensíveis
- Reporta exatamente em qual passo falhou
- Se deploy falhar **depois** do push, sugere `npm run deploy` (re-deploy sem novo bump) ou `git push --delete origin vX.Y.Z` (rollback da tag).

### Passo 5 — reportar

Após o `_release.cmd` retornar 0, leia a versão final do `package.json` e mostre:

```
Release vX.Y.Z publicado.
  GitHub  : https://github.com/vsousaesilva/lab-fluxos-demo
  Tag     : https://github.com/vsousaesilva/lab-fluxos-demo/releases/tag/vX.Y.Z
  Produção: https://labdefluxos.com.br
```

## Regras de comportamento

- **Sempre** pergunte tipo de bump + mensagem antes de rodar. Nunca assuma.
- **Não** force push (`--force`). Conflito → para, pergunta.
- **Não** mascare erro de build (não use `--no-verify` nem `--skip-types`). Corrija o tipo.
- Use **PowerShell 7 portátil** (`pwsh.exe`) sempre que precisar shell. Evite `powershell.exe` (5.1).
- Quando rodar via tool PowerShell deste agente: se vier `EUNKNOWN: uv_spawn`, o tool está temporariamente quebrado. Nesse caso, **entregue o comando exato** pro usuário rodar no terminal da IDE.

## Quando NÃO usar essa skill

- Branch experimental sem intenção de subir → faça commit local, sem release.
- Hotfix em branch separada → orquestre manualmente.
- Primeiro deploy do projeto (sem `.git` ou sem remote) → use `_git-init-push.cmd` primeiro.
- Apenas migration sem código novo → rode `_db-migrate-remote.cmd` direto.
