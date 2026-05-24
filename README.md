# Lab Fluxos — demo

Plataforma multi-agente para governança de fluxos PJe (jBPM jPDL 3.2 + BPMN 2.0).
Reescrita do `lab-fluxos` original (Spring Boot + Angular) para uma stack **leve, edge-native e deployável na Cloudflare**.

> **Status:** Fase 1 (bootstrap) concluída — schema, auth, sidebar e shell de 13 features no ar.
> Próximas fases entregam o pipeline, o validador, o RAG e o deploy production.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Hospedagem | **Cloudflare Workers** via `@opennextjs/cloudflare` |
| Frontend | **Next.js 15** (App Router) + Tailwind + shadcn/ui |
| Banco | **Cloudflare D1** (SQLite serverless) + Drizzle ORM |
| Vetorial / RAG | **Cloudflare Vectorize** (Gemini text-embedding-004, 768d) |
| Storage | **Cloudflare R2** (XMLs jPDL originais) |
| Sessões / cache | **Cloudflare KV** |
| Fila assíncrona | **Cloudflare Queues** (ingestão batch dos XMLs) |
| Auth | **better-auth** (email/senha) |
| LLM | **Google Gemini 2.0 Flash** via Vercel AI SDK |
| Editor | bpmn-js 17 + monaco-editor |

---

## Pré-requisitos

1. Conta Cloudflare com **Workers Paid plan** (US$5/mês — necessário para Vectorize)
2. Node.js 24 (use o portátil em `..\..\Portatil\node-v24.14.1-win-x64\node.exe`)
3. Chave do Google AI Studio: <https://aistudio.google.com/app/apikey>
4. Wrangler CLI: instalado como dev-dependency (`npx wrangler …`)

---

## Setup inicial (uma única vez)

Todos os scripts são `.cmd` — basta clicar duas vezes ou executar no terminal padrão do Windows (cmd.exe).
Eles já apontam para o Node portátil em `..\..\Portatil\node-v24.14.1-win-x64\`.

| Passo | Script | O que faz |
|---|---|---|
| 1 | `_setup.cmd` | `npm install` (instala todas as dependências) |
| 2 | `_cf-login.cmd` | login na Cloudflare (abre o navegador) |
| 3 | `_cf-create-resources.cmd` | cria D1 + KV + R2 + Vectorize + Queues<br/>**Anote os IDs retornados** e cole em `wrangler.toml` (`database_id` e `id`) |
| 4 | `_db-migrate-local.cmd` | aplica schema no D1 local (para desenvolvimento) |
| 5 | `_db-migrate-remote.cmd` | aplica schema no D1 remoto (produção) |
| 6 | `_secrets.cmd` | cadastra `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_GENERATIVE_AI_API_KEY` |

Para desenvolvimento local: copie `.dev.vars.example` para `.dev.vars` e preencha as chaves.

---

## Desenvolvimento

| Script | O que faz |
|---|---|
| `_dev.cmd` | Next.js em modo dev — <http://localhost:3000> |
| `_preview.cmd` | Build OpenNext + preview no runtime real do Workers |
| `_deploy.cmd` | Build + deploy para produção (Cloudflare Workers) |

Se preferir rodar direto pelo `npm` portátil sem usar os `.cmd`:

```
"..\..\Portatil\node-v24.14.1-win-x64\npm.cmd" run dev
```

(Sem `&` na frente — isso é sintaxe do PowerShell, não funciona no cmd.exe padrão do Windows.)

---

## Estrutura

```
lab-fluxos-demo/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # login, signup
│   ├── (app)/                  # área autenticada (13 features)
│   │   ├── painel/
│   │   ├── demandas/           # Fase 2
│   │   ├── analises/           # Fase 2 — agente Demand Analyst
│   │   ├── hu/                 # Fase 2 — agente User Story Writer
│   │   ├── sprints/            # Fase 2 — agente Sprint Manager
│   │   ├── revisao/            # Fase 2 — fila global
│   │   ├── bpmn/               # Fase 3 — agente BPMN Designer + bpmn-js
│   │   ├── gerador-xml/        # Fase 3 — agente PJe XML Generator + monaco
│   │   ├── validador/          # Fase 3 — 6 LintRules port TS
│   │   ├── consultor/          # Fase 4 — RAG streaming
│   │   ├── ritos/              # Fase 4 — agente Rites Scribe
│   │   ├── jira/               # Fase 5
│   │   └── agentes/            # Fase 5 — jobs + custo LLM
│   └── api/
│       └── auth/[...all]/      # better-auth handler
├── components/
│   ├── ui/                     # shadcn (Button, Card, Input, Label, Badge)
│   ├── sidebar.tsx
│   ├── page-header.tsx
│   └── coming-soon.tsx
├── lib/
│   ├── auth/                   # better-auth (server + client)
│   ├── db/
│   │   ├── schema.ts           # Drizzle (13 tabelas + 4 do better-auth)
│   │   └── client.ts
│   └── utils.ts
├── drizzle/
│   └── migrations/
│       └── 0000_init.sql       # port das V1..V12 Postgres → SQLite
├── seed/                       # Fase 4: ingest-pje-flows.ts
├── wrangler.toml
├── open-next.config.ts
├── next.config.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Roadmap

| Fase | Conteúdo | Status |
|---|---|---|
| **1** | Bootstrap (Next + OpenNext + D1 + better-auth + shell UI) | ✅ |
| **2** | Pipeline core (Demandas, Análise, HU, Sprint, Revisão) | ⏳ próxima |
| **3** | Fluxos PJe (Validador, Gerador jPDL, Designer BPMN) | ⏳ |
| **4** | RAG (ingestão dos 100+ XMLs) + Consultor + Ritos | ⏳ |
| **5** | Indicadores + Jira + polimento + deploy production | ⏳ |

---

## Origem

Reescrita do projeto institucional `lab-fluxos` (Spring Boot 3.4 + Java 21 + PostgreSQL + Keycloak + Angular 18) para uso pessoal / freelance, mantendo o domínio mas trocando completamente a stack para otimizar:

- **Custo** (de servidor dedicado para edge serverless ~US$5/mês)
- **Operação** (de Maven + Tomcat + Postgres + Keycloak para `npm run deploy`)
- **Latência** (edge global em vez de single-region)
- **Velocidade de iteração** (TypeScript full-stack em vez de Java/Angular separados)

Os **prompts dos 8 agentes** e as **6 regras de lint** são portados verbatim do Java para TS — comportamento equivalente.
