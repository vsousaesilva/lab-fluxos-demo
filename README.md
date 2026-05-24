# Lab Fluxos — demo

Plataforma multi-agente para governança de fluxos PJe (jBPM jPDL 3.2 + BPMN 2.0).
Reescrita do `lab-fluxos` institucional (Spring Boot + Angular) para uma stack **leve, edge-native e deployada na Cloudflare**.

> **Status:** em produção — <https://labdefluxos.com.br>
> **Versão atual:** ver `package.json` (`version`) ou releases em <https://github.com/vsousaesilva/lab-fluxos-demo/releases>

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
- **Designer BPMN** — agente IA gera BPMN 2.0 a partir de HU
- **Gerador XML jPDL** — agente IA gera XML jPDL 3.2 com RAG nos 212 fluxos indexados
- **Validador XML** — 6 LintRules deterministas portadas do Java (PJE-EL incluída)
- **Consultor de Fluxos** — chat RAG streaming nos XMLs (Vectorize + Gemini)
- **Catálogo de ELs** — documenta Expression Languages (`#{...}` / `${...}`) usadas nos fluxos

### Integração + Governança
- **Jira** — outbox de cards (criação + transição)
- **Agentes (jobs)** — auditoria de todos os disparos LLM com custo estimado **em R$**
- **Admin / Convites** — geração e revogação de códigos de convite (whitelist por email no `ADMIN_EMAILS`)

### UX cross-cutting
- Toda saída IA gera card com **Aprovar / Rejeitar / Editar / Regenerar com IA**
- Formulários de edição completos para 7 entidades (campo a campo, com arrays editáveis)
- Reset de pipeline preservando users, agent_jobs (histórico de custo) e RAG (212 XMLs)

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
| 8 | `_ingest-flows.cmd` | indexa os 212 XMLs PJe no Vectorize (uma vez só) |
| 9 | `_git-init-push.cmd` | inicializa repo, configura remote e faz primeiro push pro GitHub |

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
| `_db-reset-cards.cmd` | zera pipeline (preserva users, jobs e RAG) — pede confirmação dupla |

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

O que `_release.cmd` faz (via `_release.ps1`):
1. Valida portáteis em `C:\Portatil\` + branch é `main` + nenhum arquivo sensível no staging
2. `git add . && git commit -m "<msg>"` (se houver mudanças pendentes)
3. `npm version <bump>` → atualiza `package.json` + commit `release: vX.Y.Z` + tag `vX.Y.Z`
4. `git push origin main --follow-tags`
5. `opennextjs-cloudflare build && deploy`

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
│   │   ├── catalogos/els/        # catálogo de Expression Languages
│   │   ├── jira/                 # outbox Jira
│   │   ├── agentes/              # auditoria de jobs LLM + custo R$
│   │   └── admin/convites/       # admin: gera/revoga códigos de convite
│   └── api/
│       ├── auth/[...all]/        # better-auth handler
│       └── signup-invite/        # endpoint custom: valida invite antes de criar conta
├── components/
│   ├── ui/                       # shadcn (Button, Card, Input, Dialog, etc.)
│   ├── forms/                    # editores reutilizáveis (StringArrayField, etc.)
│   ├── sidebar.tsx               # admin-aware (link "Convites" só pra admin)
│   └── page-header.tsx
├── lib/
│   ├── auth/                     # better-auth + invite + admin whitelist
│   ├── ai/                       # pricing (USD→BRL), prompts, modelos Gemini 3
│   ├── agents/                   # 9 agentes (prompts, schemas, runners)
│   ├── db/
│   │   ├── schema.ts             # Drizzle (15 tabelas + 4 do better-auth)
│   │   └── client.ts
│   └── validator/                # 6 LintRules + parser jPDL
├── drizzle/
│   └── migrations/
│       ├── 0000_init.sql
│       ├── 0001_regenerate_inputs.sql
│       ├── 0002_invites.sql
│       └── 0003_expression_language.sql
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
