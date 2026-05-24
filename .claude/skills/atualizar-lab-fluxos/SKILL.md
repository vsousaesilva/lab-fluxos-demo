---
name: atualizar-lab-fluxos
description: Release end-to-end do lab-fluxos-demo no fluxo deploy-first. Use quando o usuário pedir "atualizar lab-fluxos", "fazer release", "deployar lab-fluxos", "subir lab-fluxos pra produção" ou similar. Empurra commit + build/deploy + bump+tag — bump SÓ acontece se o deploy passar (zero tags órfãs).
---

# Atualizar Lab Fluxos (release deploy-first)

Orquestra um release completo do projeto `lab-fluxos-demo` (em `C:\dev\lab-fluxos-demo`).

## Arquitetura do release

```
_release.cmd  (thin wrapper)
   |
   | 1) valida 3 portateis em C:\Portatil\
   | 2) adiciona node + git ao PATH
   | 3) carrega .cf-token (se houver)
   | 4) chama _release.ps1
   v
_release.ps1  (PowerShell 7, deploy-first)
   |
   |-- [1/4] commit das mudanças (valida branch=main, anti-leak de secrets)
   |-- [2/4] git push origin main   <- SEM tag ainda
   |-- [3/4] npm run deploy         <- TESTE DE FOGO
   `-- [4/4] npm version <bump>  →  push --follow-tags  (só se 3 passou)
```

**Por que deploy-first**: se o build/deploy falhar, **nenhum bump é feito**. Versão não infla por causa de erro de compilação. Cada tag `vX.Y.Z` no GitHub corresponde a um deploy real em produção.

## Portáteis usados (todos em `C:\Portatil\`)

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

1. **Tipo de bump**:
   - `patch` — só bug fix isolado, sem mudança de comportamento. Calcule a próxima versão (ex.: `v0.13.0 → v0.13.1`).
   - `minor` (Recommended se houver feature nova retrocompatível) — `v0.13.0 → v0.14.0`.
   - `major` — breaking change real (raro). `v0.13.0 → v1.0.0`.

   **Importante**: olhe o conteúdo do diff antes de sugerir. Múltiplas features novas = minor. Só fix = patch. Não cair na armadilha de sempre sugerir patch.

2. **Mensagem do commit**: gere 2-3 sugestões a partir dos arquivos modificados detectados em `git status`. Inclua "Other" pra digitação livre.

Casos especiais:
- **Working tree limpa**: pergunte se é só re-deploy. Se sim, sugerir `npm run deploy` direto (não passar pelo bump).
- **Branch ≠ main**: pare. Releases saem só de `main`.
- **Arquivos sensíveis** (`.dev.vars`, `.cf-token`, `.env.local`, `_backup-*.sql`) em staging: pare e avise — `.gitignore` falhou.
- **`package.json` com nova dep**: o usuário precisa rodar `npm install` antes do release (`_npm-install.cmd`). Detecte mudança em `dependencies` ou `devDependencies` e avise.

### Passo 3 — migrations novas

Verifique se há arquivo em `drizzle/migrations/` mais novo que o último aplicado. Se houver:

> "Detectei migration nova `0005_xxx.sql`. Aplicar no D1 remoto antes do deploy? (Sim/Não)"

Se sim, rode `_db-migrate-remote.cmd` via PowerShell antes do release.

### Passo 4 — executar o release

```powershell
& "C:\dev\lab-fluxos-demo\_release.cmd" <patch|minor|major> "<msg>"
```

- **Timeout do tool**: 600000ms (10 min). Build OpenNext costuma demorar 1-3 min, mas adicionar deps Office pode aumentar.
- **NÃO** rode em background — release é destrutivo no GitHub, espere o exit code.
- **NÃO** tente re-executar automaticamente se falhar.

O `_release.ps1` é defensivo:
- Falha cedo se branch ≠ main
- Bloqueia push de arquivos sensíveis
- Reporta exatamente em qual passo falhou
- Se **deploy** (passo 3) falhar → nenhum bump foi feito; usuário corrige código e roda de novo
- Se **push tag** (passo 4) falhar → deploy já tá no ar, mas tag local não chegou no GitHub. Use `_bump-and-tag.cmd <bump>` pra retry só o passo 4 OU `git push origin main --follow-tags` manual.

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
- **Olhe o diff antes**: se o release inclui features novas (não só bug fix), sugira `minor` em vez de `patch`. Cada tag no GitHub deve refletir o conteúdo dela.
- **Não** force push (`--force`). Conflito → para, pergunta.
- **Não** mascare erro de build (não use `--no-verify` nem `--skip-types`). Corrija o tipo.
- Use **PowerShell 7 portátil** (`pwsh.exe`) sempre que precisar shell. Evite `powershell.exe` (5.1).
- Quando o tool PowerShell vier `EUNKNOWN: uv_spawn`, está temporariamente quebrado. **Entregue o comando exato** pro usuário rodar no terminal da IDE — não tente outro tool.

## Scripts auxiliares relacionados

| Script | Função |
|---|---|
| `_release.cmd <bump> "<msg>"` | Release end-to-end (deploy-first) |
| `_bump-and-tag.cmd <bump>` | Só o passo 4/4 (recovery quando deploy passou mas tag não saiu) |
| `_deploy.cmd` | Só build + deploy (sem bump/tag) — útil pra re-deploy sem mexer em versão |
| `_git-sync.cmd "<msg>"` | Só commit + push (sem deploy/bump) — pra docs/scripts auxiliares |
| `_db-migrate-remote.cmd` | Aplica migrations no D1 remoto |
| `_db-counts.cmd` | Contagens das tabelas (verificação) |
| `_go-live.cmd` | Reset de pipeline com backup automático (uso raro) |

## Quando NÃO usar essa skill

- Mudança experimental sem intenção de subir pra produção → faça commit local, sem release.
- Hotfix em branch separada → orquestre manualmente.
- Primeiro deploy do projeto (sem `.git` ou sem remote) → use `_git-init-push.cmd` primeiro.
- Apenas migration sem código novo → rode `_db-migrate-remote.cmd` direto.
- Mudança só em docs/scripts auxiliares → use `_git-sync.cmd` (não precisa rebuild/redeploy).

## Histórico (para contexto)

- **v0.4.0** e anteriores: rodavam em fluxo antigo (bump-first). Funcionou mas produziu tags órfãs quando build falhava.
- **v0.5.0–v0.7.0**: tags órfãs no GitHub (decorrentes do fluxo antigo + builds que falharam). Limpas depois.
- **v0.8.0+**: fluxo deploy-first. Cada tag = um deploy real.
- A partir de **v0.12.0**: app em operação real (após `_go-live.cmd`).
