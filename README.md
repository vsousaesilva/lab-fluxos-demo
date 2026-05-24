# Lab Fluxos — demo

Plataforma multi-agente para governança de fluxos PJe (jBPM jPDL 3.2 + BPMN 2.0).
Reescrita do `lab-fluxos` institucional (Spring Boot + Angular) para uma stack **leve, edge-native e deployada na Cloudflare**.

> **Status:** em **operação real** desde 2026-05-24 — <https://labdefluxos.com.br>
> **Versão atual:** ver `package.json` (`version`) ou releases em <https://github.com/vsousaesilva/lab-fluxos-demo/releases>
> **Dados:** 212 XMLs PJe indexados (RAG) · 2.7k Expression Languages catalogadas com IA · 217 agent_jobs auditados

---

## Stack

| Camada | Tecnologia |
|---|---|
| Hospedagem | **Cloudflare Workers** via `@opennextjs/cloudflare` |
| Frontend | **Next.js 15** (App Router, RSC, Server Actions) + Tailwind + shadcn/ui |
| Banco | **Cloudflare D1** (SQLite serverless) + Drizzle ORM |
| Vetorial / RAG | **Cloudflare Vectorize** (Gemini `embedding-001`, 768d, cosine) |
| Storage | **Cloudflare R2** (XMLs jPDL originais — 212 fluxos PJe indexados) |
| Sessões / cache | **Cloudflare KV** |
| Fila assíncrona | **Cloudflare Queues** (ingestão batch dos XMLs) |
| Auth | **better-auth** (signup só com código de convite, admin via whitelist `ADMIN_EMAILS`) |
| LLM | **Google Gemini 3** (`gemini-3-flash-preview`, `gemini-3.1-pro-preview`) via Vercel AI SDK 4 |
| Editor | bpmn-js 17 (renderer manual com namespaces compatíveis com Bizagi) + monaco-editor |

---

## Funcionalidades em produção

### Pipeline Scrum + PJe
- **Demandas** — entrada do pipeline (registro manual)
- **Análise de Demanda** — agente IA gera resumo + backlog candidato + critérios
- **Histórias de Usuário** — agente IA gera HU no template oficial (BDD + RNs)
- **Sprints** — agente IA propõe sprint baseada nas HUs aprovadas
- **Ritos Scrum** — agente IA estrutura ata de planning/review/retro/standup
- **Revisão** — fila global de aprovação (análises DRAFT + HUs DRAFT + sprints PROPOSED)

### Fluxos PJe
- **Designer BPMN** — agente IA gera BPMN 2.0 a partir de HU (compatível com Bizagi Modeler)
- **Gerador XML jPDL** — agente IA gera XML jPDL 3.2 com RAG nos 212 fluxos indexados
- **Validador XML** — 6 LintRules deterministas portadas do Java (PJE-EL incluída)
- **Consultor de Fluxos** — chat RAG streaming nos XMLs (Vectorize + Gemini)
- **Catálogo de ELs** — 2.713 Expression Languages (`#{...}` / `${...}`) extraídas dos 212 XMLs e descritas com IA (agente `EL_DESCRIBER` Gemini Flash). Suporta extração automática, descrição individual ou em batch, paginação real (100/página), busca por código/objetivo.

### Anexos em demandas (v0.5+)
- Drag-and-drop no formulário: até 10 arquivos × 10 MB × 100 MB total por demanda
- Imagens (JPG/PNG/WEBP/GIF) e PDF lidos pelo **Demand Analyst** via Gemini multimodal
- Texto (TXT/MD/CSV) injetado inline no prompt
- Office (XLSX/DOCX) armazenado mas não consumido pela IA ainda
- R2 dedicado `lab-fluxos-demand-attachments`

### Integração + Governança
- **Jira** — outbox de cards (criação + transição)
- **Agentes (jobs)** — auditoria de todos os disparos LLM com custo estimado **em R$**
- **Admin / Convites** — geração e revogação de códigos de convite (whitelist por email no `ADMIN_EMAILS`)

### UX cross-cutting
- Toda saída IA gera card com **Aprovar / Rejeitar / Editar / Regenerar com IA**
- Formulários de edição completos para 7 entidades (campo a campo, com arrays editáveis)
- **Responsivo** (v0.12): sidebar vira drawer com hamburger em mobile (< 768px), layout adapta padding/espaçamento, PageHeader empilha
- Reset de pipeline (`_go-live.cmd` / `_db-reset-cards.cmd`) preservando users, agent_jobs (histórico de custo), RAG (212 XMLs) e catálogo de ELs

---

## Ambiente portátil (sem instalação no PATH)

Esta máquina **não tem PowerShell, Node nem Git instalados no PATH**. Os executáveis são portáteis em `C:\Portatil\`:

| Ferramenta | Caminho |
|---|---|
| Git | `C:\Portatil\PortableGit\cmd\git.exe` |
| Node 24 + npm | `C:\Portatil\node-v24.14.1-win-x64\node.exe` (+ `npm.cmd`) |
| PowerShell 7 | `C:\Portatil\PowerShell-7.6.1-win-x64\pwsh.exe` |

Todos os scripts `_*.cmd` já apontam para esses caminhos absolutos. Você não precisa instalar nada — basta clonar e rodar.

---

## Setup inicial (uma única vez)

Todos os scripts são `.cmd` — duplo-clique ou execução no cmd.exe / PowerShell.

| Passo | Script | O que faz |
|---|---|---|
| 1 | `_setup.cmd` | `npm install` |
| 2 | `_cf-login.cmd` | login Cloudflare (abre browser) |
| 3 | `_cf-create-resources.cmd` | cria D1 + KV + R2 + Vectorize + Queues (anote os IDs e cole em `wrangler.toml`) |
| 4 | `_db-migrate-local.cmd` | aplica schema no D1 local (dev) |
| 5 | `_db-migrate-remote.cmd` | aplica schema no D1 remoto (prod) |
| 6 | `_secrets.cmd` | cadastra `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, secrets Jira |
| 7 | `_secret-admin-emails.cmd` | cadastra `ADMIN_EMAILS` (whitelist de admins, separados por vírgula) |
| 8 | `_cf-create-attachments-bucket.cmd` | cria bucket R2 `lab-fluxos-demand-attachments` |
| 9 | `_ingest-flows.cmd` | indexa os 212 XMLs PJe no Vectorize (uma vez só) |
| 10 | `_git-init-push.cmd` | inicializa repo, configura remote e faz primeiro push pro GitHub |

Para desenvolvimento local: copie `.dev.vars.example` para `.dev.vars` e preencha as chaves.

---

## Desenvolvimento

| Script | O que faz |
|---|---|
| `_dev.cmd` | Next.js dev — <http://localhost:3000> |
| `_preview.cmd` | Build OpenNext + preview no runtime real do Workers |
| `_deploy.cmd` | Build + deploy direto pra produção (sem bump/tag) |
| `_kill-port-3000.cmd` | mata processo travado na 3000 |
| `_clean-next.cmd` | limpa `.next/`, `.open-next/`, `.wrangler/` |
| `_db-inspect-jobs.cmd` | inspeciona AgentJob no D1 (histórico LLM) |
| `_db-counts.cmd` | mostra contagens de todas as tabelas no D1 remoto |
| `_db-reset-cards.cmd` | zera pipeline (preserva users, jobs, RAG, ELs) — pede confirmação dupla |
| `_go-live.cmd` | reset completo pra início de operação real: backup D1 + limpa R2 demand-attachments + executa reset SQL + valida contagens |
| `_bump-and-tag.cmd <bump>` | aplica só o passo 4/4 do release (`npm version` + push tag) — útil quando deploy passou mas tag não saiu |

---

## Release / Deploy

Fluxo automatizado: bump de versão + commit + push + deploy em uma chamada.

```cmd
_release.cmd <patch|minor|major> "<commit message>"
```

Exemplos:
```cmd
_release.cmd patch "fix: contador do painel bate com /revisao"
_release.cmd minor "feat: catalogo de ELs + sistema de convites"
```

O que `_release.cmd` faz (via `_release.ps1`) — **fluxo deploy-first (v0.8.0+)**:
1. Valida portáteis em `C:\Portatil\` + branch é `main` + nenhum arquivo sensível no staging
2. `git add . && git commit -m "<msg>"` (se houver mudanças pendentes)
3. `git push origin main` — sobe o commit do código **sem tag ainda**
4. `opennextjs-cloudflare build && deploy` — teste de fogo
5. **Só se deploy passar**: `npm version <bump>` → bump + commit `release: vX.Y.Z` + tag → `git push --follow-tags`

Se deploy falhar, **nenhum bump é feito**. Corrige o código, roda de novo. Cada tag `vX.Y.Z` no GitHub corresponde a um deploy real em produção.

> ℹ️ Tags `v0.5.0..v0.7.0` no histórico do GitHub são órfãs — vieram de uma versão antiga do script que bumpava antes do deploy. Desconsidere essas; a primeira tag real do fluxo novo é `v0.8.0`.

Para invocar via Claude Code: peça **"atualizar lab-fluxos"** — a skill `atualizar-lab-fluxos` em `.claude/skills/` orquestra perguntando bump + mensagem.

---

## Estrutura

```
lab-fluxos-demo/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # login, signup (com código de convite)
│   ├── (app)/                    # área autenticada
│   │   ├── painel/               # visão geral + fila de revisão
│   │   ├── demandas/             # pipeline: entrada
│   │   ├── analises/             # agente Demand Analyst
│   │   ├── hu/                   # agente User Story Writer
│   │   ├── sprints/              # agente Sprint Manager
│   │   ├── ritos/                # agente Rites Scribe
│   │   ├── revisao/              # fila global de aprovação
│   │   ├── bpmn/                 # agente BPMN Designer (export Bizagi)
│   │   ├── gerador-xml/          # agente PJe XML Generator (RAG)
│   │   ├── validador/            # 6 LintRules deterministas
│   │   ├── consultor/            # chat RAG streaming
│   │   ├── catalogos/els/        # catálogo de Expression Languages + auto-extração + describe IA
│   │   ├── jira/                 # outbox Jira
│   │   ├── agentes/              # auditoria de jobs LLM + custo R$
│   │   └── admin/convites/       # admin: gera/revoga códigos de convite
│   └── api/
│       ├── auth/[...all]/        # better-auth handler
│       ├── signup-invite/        # endpoint custom: valida invite antes de criar conta
│       └── demand-attachments/   # upload + download de anexos de demanda (R2)
├── components/
│   ├── ui/                       # shadcn (Button, Card, Input, Dialog, etc.)
│   ├── forms/                    # editores reutilizáveis (StringArrayField, etc.)
│   ├── sidebar.tsx               # admin-aware (link "Convites" só pra admin)
│   └── page-header.tsx
├── lib/
│   ├── auth/                     # better-auth + invite + admin whitelist
│   ├── ai/                       # pricing (USD→BRL), prompts, modelos Gemini 3, stream-agent multimodal
│   ├── agents/                   # 10 agentes (incluindo el-describer)
│   ├── attachments/              # config + actions + validação de anexos de demanda
│   ├── text/                     # mojibake fix (planejado)
│   ├── db/
│   │   ├── schema.ts             # Drizzle (17 tabelas + 4 do better-auth)
│   │   └── client.ts
│   └── validator/                # 6 LintRules + parser jPDL
├── drizzle/
│   ├── migrations/
│   │   ├── 0000_init.sql
│   │   ├── 0001_regenerate_inputs.sql
│   │   ├── 0002_invites.sql
│   │   ├── 0003_expression_language.sql
│   │   └── 0004_demand_attachments.sql
│   └── queries/
│       └── reset_pipeline.sql    # SQL idempotente usado pelo _go-live.cmd
├── seed/                         # ingest-pje-flows.ts (212 XMLs → Vectorize)
├── .claude/skills/               # skills Claude Code
│   └── atualizar-lab-fluxos/     # release end-to-end
├── _*.cmd, _release.ps1          # scripts de automação
└── wrangler.toml
```

---

## Origem

Reescrita do projeto institucional `lab-fluxos` (Spring Boot 3.4 + Java 21 + PostgreSQL + Keycloak + Angular 18) para uso pessoal/freelance, mantendo o domínio mas trocando a stack completamente para otimizar:

- **Custo** — de servidor dedicado para edge serverless (~US$5/mês fixo Cloudflare + uso variável Gemini)
- **Operação** — de Maven + Tomcat + Postgres + Keycloak para `_release.cmd`
- **Latência** — edge global em vez de single-region
- **Velocidade de iteração** — TypeScript full-stack + Server Actions vs Java/Angular separados

Os **prompts dos 9 agentes** e as **6 regras de lint** são portados verbatim do Java para TS — comportamento equivalente.
