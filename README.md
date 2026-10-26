# RoleProof

Mock interviews grounded in your resume, the job description and your real code.

RoleProof is an AI interviewer. You pick a role and a level, add whatever you have (a resume, a job description, a GitHub repo) and answer out loud. It asks one question at a time, follows up on what you actually said, checks your claims against your code and ends with a report on what to practice next.

This README is mainly the **backend plan**: what exists today, how the pieces fit together, and the order to build them in. The setup instructions are at the end.

---

## Contents

1. [Where things stand](#1-where-things-stand)
2. [Architecture](#2-architecture)
3. [Tech choices](#3-tech-choices)
4. [Data model](#4-data-model)
5. [API](#5-api)
6. [The interview agent](#6-the-interview-agent)
7. [Ingesting resumes, job descriptions and repos](#7-ingesting-resumes-job-descriptions-and-repos)
8. [Repo tools and claim checks](#8-repo-tools-and-claim-checks)
9. [Voice](#9-voice)
10. [Scoring, reports and memory](#10-scoring-reports-and-memory)
11. [Security and privacy](#11-security-and-privacy)
12. [Configuration](#12-configuration)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Build order](#15-build-order)
16. [Open decisions](#16-open-decisions)
17. [Development setup](#development-setup)

---

## 1. Where things stand

**Done**

- Monorepo: Next.js web app, Hono server, shared packages (Turborepo + pnpm).
- Auth: email and password sign-up, sign-in and sign-out with Better Auth. Sessions are stored in Postgres and tested end to end.
- Database: local PostgreSQL 18 with Prisma. Only the auth tables exist so far. The `pgvector` extension is available but not yet enabled.
- API layer: oRPC with `publicProcedure` and `protectedProcedure` (which requires sign-in). There's only a health check so far.
- Frontend: landing page, login page and a protected `/dashboard` placeholder.

**Not started:** everything interview-related, which is the rest of this document.

## 2. Architecture

```
 Browser (Next.js, apps/web)
   │  speech-to-text and text-to-speech run here in v1 (Web Speech API)
   │  sends answers as text, plays questions aloud
   ▼
 Server (Hono, apps/server)  ── long-running Node process, not serverless
   ├─ /api/auth/*   Better Auth                     (packages/auth)
   ├─ /api/rpc/*    oRPC routers                    (packages/api)
   └─ agent runtime LangGraph graphs and tools      (packages/agent, new)
         ├─ LLM: Gemini (free tier to start)
         ├─ GitHub: repo metadata and shallow clones
         └─ local disk: cloned repos, temporary uploads
   ▼
 PostgreSQL + pgvector                              (packages/db)
   app tables (Prisma) · LangGraph checkpoints · code embeddings
```

**Where code lives**

| Package | Responsibility |
| --- | --- |
| `apps/server` | HTTP entry point. Wires env, database, auth and the agent into the API context. |
| `packages/api` | oRPC routers. Input validation, ownership checks, calls into the agent. No LLM code. |
| `packages/agent` (new) | LangGraph graphs, prompts, LLM client, repo tools, ingestion (PDF, repo). |
| `packages/db` | Prisma schema, migrations, client. |
| `packages/auth` | Better Auth config. |

**Why the agent runs in a long-lived server:** an interview lasts 20–60 minutes, a repo clone can take a while, and the agent keeps clones on disk between turns. Serverless functions time out and lose their disk. So the server deploys somewhere long-running (see [Deployment](#14-deployment)), while the web app can stay on Vercel.

## 3. Tech choices

Pin exact versions for LangChain and LangGraph; their APIs change often. The versions below were current and at least two weeks old when this plan was written.

| Need | Choice | Version |
| --- | --- | --- |
| Agent framework | `@langchain/langgraph` | 1.4.21 |
| LangChain core | `@langchain/core` | 1.2.17 |
| LLM client | `@langchain/google-genai` (Gemini) | 2.3.2 |
| Resumable interviews | `@langchain/langgraph-checkpoint-postgres` | 1.0.6 |
| Repo cloning | `simple-git` | 4.0.2 |
| Code search | `@vscode/ripgrep` | 1.18.0 |
| Code parsing (phase 5) | `web-tree-sitter` (WASM; avoid native tree-sitter on Windows) | 0.27.1 |
| PDF text | `unpdf` | 1.8.1 |
| Tests | `vitest` | 5.0.3 |

**LLM:** start on Google Gemini's free tier, using a Flash model (`gemini-3.5-flash` at the time of writing). Keep the model name in an env var so it's easy to change. The free tier has low per-minute and per-day limits and its prompts may be used for training, so it's fine for development but not for real users. Keep all LLM calls behind one small interface in `packages/agent/llm` so switching to Claude or OpenAI later is a config change.

## 4. Data model

New Prisma models, in `packages/db/prisma/schema/interview.prisma` and `repo.prisma`. Every row is owned by a user and deleted when that user is deleted.

```prisma
enum InterviewType { PROJECT_DEEP_DIVE BACKEND_CONCEPTS SYSTEM_DESIGN DSA BEHAVIORAL RESUME_SCREEN FULL_LOOP }
enum Level         { INTERN JUNIOR MID SENIOR STAFF }
enum Difficulty    { EASY MEDIUM HARD }
enum AnswerMode    { VOICE TEXT }
enum SessionStatus { DRAFT PREPARING READY IN_PROGRESS COMPLETED FAILED ABANDONED }
enum Speaker       { INTERVIEWER CANDIDATE }
enum DocumentKind  { RESUME JOB_DESCRIPTION NOTES }
enum RepoStatus    { PENDING CLONING INDEXING READY FAILED }

model Document {            // resume, job description or notes
  id, userId, kind, title
  text        String         // extracted text; the raw PDF is not kept
  profile     Json?          // structured extraction: skills, projects, claims
  createdAt
}

model Repository {          // a GitHub repo the user added
  id, userId, url, owner, name, defaultBranch, commitSha
  status      RepoStatus
  error       String?
  sizeKb, fileCount
  map         Json?          // file tree, languages, key files
  summary     String?        // short overview written during ingest
  ingestedAt
}

model RepoChunk {           // phase 5: searchable pieces of code
  id, repositoryId, path, startLine, endLine, content, symbol?
  embedding   Unsupported("vector(768)")
}

model InterviewSession {
  id, userId, type, company?, role, level, difficulty, answerMode
  durationMin Int
  status      SessionStatus
  plan        Json?          // topics, goals and sources chosen during setup
  threadId    String         // LangGraph checkpoint thread
  startedAt?, endedAt?, createdAt
  sources     SessionSource[]
  turns       Turn[]
  report      Report?
}

model SessionSource {       // which documents and repos a session uses
  sessionId, documentId?, repositoryId?
}

model Turn {                // one question or one answer
  id, sessionId, index, speaker, text
  topic       String?
  kind        String?        // question | follow_up | hint | answer | closing
  references  Json?          // validated file:line refs shown in the code panel
  durationSec Int?           // how long a spoken answer took
  createdAt
}

model Evaluation {          // the evaluator's verdict on one answer
  id, turnId, topic
  scores      Json           // rubric dimension -> 1..5
  feedback    String
  evidence    Json           // quotes from the answer, file:line refs
  claims      Json?          // claims found and their verify_claim results
}

model Report {
  id, sessionId, overall Int
  topicScores Json, strengths Json, weakAreas Json, prepPlan Json
  createdAt
}

model WeakArea {            // memory across sessions
  id, userId, topic, description
  severity    Int
  timesSeen   Int
  lastSessionId
  resolvedAt  DateTime?
}
```

Notes:

- **Difficulty follows level** unless the user overrides it: Intern and Junior are Easy, Mid is Medium, Senior and Staff are Hard.
- **`User` relations:** `auth.prisma` is regenerated by `pnpm auth:generate`. After running it, re-add the `User` relation fields for these models, or keep `userId` as a plain indexed column with cascade handled in code.
- **Migrations:** move from `db:push` to `db:migrate` once these tables exist, so schema changes are tracked.

## 5. API

All routes are oRPC procedures under `/api/rpc`, use `protectedProcedure`, and check that the resource belongs to the signed-in user. Inputs are validated with zod.

| Router | Procedure | What it does |
| --- | --- | --- |
| `documents` | `upload` | Accepts a PDF (≤ 5 MB) or pasted text, extracts text, stores a `Document`. |
| | `list` / `get` / `delete` | |
| `repos` | `add` | Validates a public GitHub URL and starts ingest in the background. Returns the repo with status `PENDING`. |
| | `get` / `list` / `delete` / `refresh` | `delete` also removes the clone from disk. `refresh` re-clones the latest commit. |
| | `readFile` | Returns a line range for the code panel, using the same sandbox as the agent's tools. |
| `sessions` | `create` | Type, role, level, difficulty, duration, answer mode, document and repo IDs. Builds the plan. |
| | `start` | Runs the graph until the first question. |
| | `answer` | `{ sessionId, text, durationSec? }`. Resumes the graph and streams back the next interviewer turn. |
| | `hint` / `skip` / `end` | Candidate controls. `end` produces the report early. |
| | `get` / `list` | Session with turns and status, for the interview room and the dashboard. |
| `reports` | `get` | The report for a finished session. |
| `memory` | `weakAreas` | The user's unresolved weak areas, for the dashboard. |

**Streaming:** `sessions.answer` and `sessions.start` return an oRPC event iterator. The browser can show the interviewer's words as they arrive and start speaking them as soon as the first sentence is complete.

## 6. The interview agent

Two LangGraph graphs in `packages/agent/graphs`.

### Setup graph

Runs once when a session is created.

```
load sources ─► extract resume / JD profile ─► (repo ready?) ─► build plan ─► READY
```

**Plan:** an ordered list of topics, roughly one per 5–7 minutes of the session. For each topic it records:
- what to probe;
- why it was chosen (a JD requirement, a resume claim, a repo hook or a past weak area);
- the sources to draw on;
- a target difficulty.

### Interview graph

Runs for the whole session and is resumable at any point.

```
pick_topic ─► ask ─► wait_for_answer (interrupt) ─► evaluate ─► decide
    ▲                                                            │
    │        follow_up / hint ───────────────────────────────────┤
    └──────────── next_topic ────────────────────────────────────┤
                                     wrap_up ─► write_report ─► END
```

| Node | Job |
| --- | --- |
| `pick_topic` | Next topic from the plan. Re-orders if time is running out. |
| `ask` | Interviewer LLM writes one question. In repo sessions it may call repo tools first. Saves an `INTERVIEWER` turn with validated references. |
| `wait_for_answer` | `interrupt()` pauses the graph. `sessions.answer` resumes it with `Command({ resume: text })`. Saves a `CANDIDATE` turn. |
| `evaluate` | A **separate** evaluator call with structured output (zod). It scores against the rubric, lists gaps and pulls out claims. Claims about code go to `verify_claim`. Saves an `Evaluation`. |
| `decide` | Rules first, LLM second (see below). |
| `wrap_up` | Short closing line, marks the session `COMPLETED`. |
| `write_report` | Builds the `Report` and updates `WeakArea` memory. |

**Follow-up rules** in `decide`:

- **Vague or incomplete answer:** follow up on the specific gap, quoting the candidate's words. At most 2 follow-ups per topic.
- **Strong answer:** go one level deeper or harder, or move on if the topic is covered.
- **Wrong answer:** probe once to see if they catch it, then move on and record it.
- **"I don't know":** offer a hint if hints are on, otherwise move on.
- **Claim contradicted by the code:** ask about the specific `file:line`.
- **Time running low:** skip remaining follow-ups and go to the next topic or wrap up.

**State:** `sessionId`, `plan`, `topicIndex`, `followUpsOnTopic`, a recent message window, a running summary of earlier turns (keeps prompts small), and `elapsedSec`.

**Checkpoints:** `PostgresSaver` with `thread_id = session.threadId`. A refresh or server restart continues the interview where it stopped.

**Prompts:** in `packages/agent/prompts`, one file per role (interviewer, evaluator, planner, report writer). The interviewer never sees rubric scores. The evaluator never writes questions.

**Free-tier budget:** each turn costs about 2–4 LLM calls (ask, with or without tools, plus evaluate). Retry `429` errors with backoff, cap tool calls per question (say 4), and keep only a summary of older turns in the prompt.

## 7. Ingesting resumes, job descriptions and repos

Code for this goes in `packages/agent/ingest`.

**Resume and job description**

1. Upload a PDF or paste text. Check the file type and size, extract the text with `unpdf`, then discard the PDF.
2. One LLM call extracts a structured profile:
   - Resume: skills, roles, projects and **claims**, each with the exact quote (for example "cut latency 40% with Redis").
   - Job description: required and nice-to-have skills, seniority signals.
3. The planner uses the claims (resume questions, plus `verify_claim` when a repo is linked) and the job description's skills (to weight topics).

**GitHub repo (public repos first)**

1. **Validate:** the URL must match `https://github.com/<owner>/<repo>`. Use the GitHub API to check that it exists, is public and is under the size limit (default 100 MB). Optional `GITHUB_TOKEN` raises API limits.
2. **Shallow clone:**
   - `simple-git` runs `clone --depth 1 --single-branch --no-tags` with `-c core.symlinks=false`, `GIT_TERMINAL_PROMPT=0` and a timeout.
   - The target is `REPOS_DIR/<repositoryId>`, and the commit SHA is recorded.
3. **Map:**
   - Walk the files, skipping `.git`, `node_modules`, build output, vendored code, lockfiles, binaries and files over 512 KB. Cap at 5,000 files.
   - Record the tree, languages and line counts, and find the key files: README, manifests, entry points, routes, schema.
4. **Summarize:** the LLM writes a short overview and per-area notes from the key files. These are stored on `Repository`.
5. **Index (phase 5):** tree-sitter extracts symbols. Code is chunked by symbol, embedded into `RepoChunk.embedding` (pgvector) and used for semantic search.

**Status:** status moves `PENDING → CLONING → INDEXING → READY` (or `FAILED` with a readable error). The UI polls `repos.get`.

**Later:** private repos via GitHub OAuth (a Better Auth social provider with the `repo` scope).

## 8. Repo tools and claim checks

These tools are available to the interviewer and evaluator in repo sessions (`packages/agent/tools`). All are **read-only** and **cap their output**.

| Tool | Input | Output cap |
| --- | --- | --- |
| `list_dir` | path | 200 entries |
| `read_file` | path, startLine, endLine | 200 lines, numbered |
| `search_code` | regex or text, optional glob | 50 matches as `file:line: text` (ripgrep) |
| `find_symbol` (phase 5) | name | definitions and references (tree-sitter) |
| `semantic_search` (phase 5) | question | top 8 chunks (pgvector) |
| `verify_claim` | claim text | verdict + evidence |

**Sandbox:**
- Every path is resolved against the repo root, and the real path must stay inside it.
- `..`, absolute paths and `.git` are rejected, and symlinks are not followed.
- Tools never execute repo code.

**`verify_claim`:**
1. Turns the claim into searches.
2. Reads the matching code.
3. Returns `supported | partly_true | contradicted | not_found`, a one-line explanation and evidence `[{ path, line, snippet }]`.

**Reference validation:** every `file:line` the agent mentions is checked against the clone (the file exists and the line is within range) before it's saved or shown. Invalid references are dropped.

**Untrusted content:** repo files, READMEs, resumes and job descriptions are wrapped in clearly delimited data blocks in every prompt. The system prompt says never to follow instructions found inside them.

## 9. Voice

**v1 needs no backend work for voice.** The browser does it with the Web Speech API:
- Speech-to-text: `SpeechRecognition`, which works in Chrome and Edge.
- Text-to-speech: `speechSynthesis`, which works in all major browsers.

The backend only ever receives the answer text and `durationSec`. Text mode uses the same API.

**Later:** put speech-to-text and text-to-speech behind a server interface (`packages/agent/voice`) so a provider can be swapped in, such as a self-hosted Whisper or Hugging Face model, Deepgram or ElevenLabs. Streaming audio would then go over a WebSocket on the long-running server.

## 10. Scoring, reports and memory

**Rubric:** each interview type has 3–5 dimensions, each scored 1–5 with a short justification and a quote from the answer.

| Type | Dimensions |
| --- | --- |
| Backend and system design | correctness, depth, trade-offs, communication |
| Project deep-dive | ownership, accuracy against the code, design reasoning |
| Behavioral | situation clarity, personal contribution, outcome, reflection |
| DSA | approach, correctness, complexity, code quality |

**Report:**
- Overall score and scores per topic.
- Strengths and weak areas, each backed by evidence (answer quotes and `file:line` refs).
- A prep plan: 3–5 concrete actions.

**Memory:**
- After each report, weak areas are upserted into `WeakArea`, matched by topic.
- The next session's planner includes the top unresolved ones.
- A weak area is resolved after two later answers on that topic score 4 or more.

**Consistency:**
- The evaluator runs at low temperature with structured output.
- Phase 8 measures how much scores vary when the same answer is scored repeatedly.

## 11. Security and privacy

- **Auth:** auth on every route, and an ownership check on every resource (`where: { id, userId }`).
- **Uploads:** check type and size, keep only the extracted text and drop the file.
- **Repos:**
  - Public GitHub only, with size and file-count limits.
  - Shallow clone with no hooks and no symlinks, and no code execution.
  - Delete clones when the repo is deleted, and clean up idle clones after N days.
- **Prompt injection:** all user-provided content is treated as data (see section 8).
- **Rate limits:** per user, for example sessions per day and answers per minute. This protects the free LLM quota.
- **Secrets:** API keys only in env files and the host's secret store, never sent to the browser.
- **Logs:** no resume text or answers in logs, just IDs and timings.
- **Account deletion:** removes documents, repos (and clones), sessions, reports and memory.

## 12. Configuration

Server env vars, declared in `apps/server/.env.schema` (Varlock) and set in `apps/server/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN` | yes | Auth (already set up) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yes, from phase 1 | Gemini API key from Google AI Studio |
| `LLM_MODEL` | no | Default `gemini-3.5-flash` |
| `REPOS_DIR` | no | Where clones live. Default `./.data/repos` (git-ignored) |
| `GITHUB_TOKEN` | no | Higher GitHub API limits |
| `MAX_REPO_MB` | no | Default `100` |

## 13. Testing

- **Unit tests (vitest):** path sandbox, `file:line` validator, URL validation, file-walk filters, PDF extraction, plan builder rules, `decide` rules.
- **Graph tests:** run the interview graph with a fake LLM that returns scripted outputs. Check the interrupt/resume flow, follow-up limits, time budget and checkpoint resume.
- **API tests:** ownership checks, meaning user A can't read user B's session.
- **Agent evals (phase 8):**
  - A small repo with planted flaws, to check that `verify_claim` catches them.
  - A set of claims with known verdicts, to measure accuracy.
  - The same answers scored repeatedly, to measure consistency.

## 14. Deployment

- **Web:** Vercel, as configured in `vercel.json` today.
- **Server:** a long-running Node host such as Railway, Fly.io or Render, with a persistent volume for `REPOS_DIR`. The current `vercel.json` also deploys the server as Vercel functions. That works for auth but not for interviews, so the server service moves off Vercel before phase 1 ships.
- **Database:** Supabase Postgres, which supports pgvector, or any managed Postgres 15+.
- **Migrations:** `prisma migrate deploy` runs on each server deploy.

## 15. Build order

Each phase ends with something you can try. It follows the roadmap in `CLAUDE.md`.

### Phase 0 · Foundations
- [ ] First git commit
- [ ] Get a Gemini API key. Add `GOOGLE_GENERATIVE_AI_API_KEY` and `LLM_MODEL` to the env schema.
- [ ] Create `packages/agent` with the LLM interface. Add pinned versions to the pnpm catalog.
- [ ] vitest set up across packages
- [ ] Shared error handling, ownership helper and per-user rate limiter in `packages/api`
- [ ] Switch to `prisma migrate`

**Done when:** a test can call the LLM through the interface, and `pnpm test` runs.

### Phase 1 · First interview (role and level only)
- [ ] Models: `InterviewSession`, `Turn`
- [ ] `sessions.create / start / answer / end / get / list`
- [ ] Interview graph: `pick_topic → ask → wait_for_answer → decide`, with simple follow-up rules
- [ ] Postgres checkpointer, so refreshing mid-interview resumes it
- [ ] Streaming interviewer replies

**Done when:** you can pick Backend / Mid, answer by voice in the browser, get real follow-ups, refresh the page and continue.

### Phase 2 · Resume and job description
- [ ] `Document` model and `documents.upload / list / delete`
- [ ] PDF text extraction and profile extraction (skills and claims)
- [ ] Setup graph and plan builder using the job description's skills and resume claims

**Done when:** a session with a resume asks about specific lines on it.

### Phase 3 · Scoring and report
- [ ] `Evaluation`, `Report` models
- [ ] Separate evaluator node and per-type rubrics
- [ ] `write_report` node and `reports.get`

**Done when:** every finished session has a report with scores, evidence and a prep plan.

### Phase 4 · Repo ingest
- [ ] `Repository` model and `repos.add / get / list / delete / refresh`
- [ ] URL and size validation, shallow clone, file map, summaries
- [ ] Background job with status updates and cleanup

**Done when:** adding a public repo reaches `READY` with a file map and summary.

### Phase 5 · Repo interviews
- [ ] Sandboxed `list_dir`, `read_file`, `search_code`
- [ ] Project deep-dive type, with questions citing real `file:line`
- [ ] `repos.readFile` for the code panel
- [ ] tree-sitter symbols, chunking, pgvector embeddings and `semantic_search`

**Done when:** an interview on your repo asks about real code, and every reference opens the right lines.

### Phase 6 · Claim checks
- [ ] `verify_claim` tool and claim extraction in the evaluator
- [ ] Follow-ups triggered by contradicted claims

**Done when:** saying something your code contradicts gets a follow-up pointing at the exact line.

### Phase 7 · Memory and more interview types
- [ ] `WeakArea` memory feeding the planner
- [ ] System design, behavioral, DSA, resume screen and full loop types, each with its rubric

### Phase 8 · Agent evals
- [ ] Seeded-flaw repo, claim-accuracy set, scoring-consistency check, run in CI

### Phase 9 · Voice upgrade and deploy
- [ ] Optional server speech-to-text and text-to-speech provider
- [ ] Server on a long-running host, Supabase, production env, monitoring

## 16. Open decisions

| Question | Current lean |
| --- | --- |
| LLM provider | Gemini free tier for development. Re-decide before real users. |
| Agent in `apps/server` or a separate `apps/agent` | Inside `apps/server` until it needs to scale separately |
| Long-term memory in a Prisma table or the LangGraph Store | Prisma `WeakArea`: easier to query and show on the dashboard |
| Keep uploaded PDFs? | No, keep extracted text only |
| Private repos | After phase 6, via GitHub OAuth |
| Server voice provider | Not needed until phase 9 |

---

## Development setup

**Requirements:** Node 24, pnpm 10, PostgreSQL 15+ (with pgvector for phase 5), Git.

```bash
pnpm install          # also generates env types (Varlock)
pnpm db:generate      # Prisma client; rerun after schema changes
pnpm db:push          # apply the schema (switch to db:migrate in phase 0)
pnpm dev              # web on http://localhost:3001, server on http://localhost:3000
```

**Environment:** each app has an `.env.schema` (committed) and an `.env` (ignored).
- Server: `apps/server/.env` needs `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ characters), `BETTER_AUTH_URL=http://localhost:3000` and `CORS_ORIGIN=http://localhost:3001`.
- Web: `apps/web/.env` needs `NEXT_PUBLIC_SERVER_URL=http://localhost:3000/api`.

The server doesn't reload when `.env` changes, so restart `pnpm dev` after editing it. After changing a schema, run `pnpm env:generate`.

**Useful scripts**

| Command | What it does |
| --- | --- |
| `pnpm dev:web` / `pnpm dev:server` | Run one app |
| `pnpm check-types` | Type-check everything |
| `pnpm db:studio` | Browse the database |
| `pnpm db:migrate` | Create and apply a migration |
| `pnpm auth:generate` | Regenerate the Better Auth schema (then re-add `User` relations, see section 4) |

**Project structure**

```
roleproof/
├── apps/
│   ├── web/        Next.js: landing, login, dashboard, interview room
│   └── server/     Hono: auth, API, agent runtime
└── packages/
    ├── api/        oRPC routers
    ├── agent/      LangGraph graphs, prompts, tools, ingestion (planned)
    ├── auth/       Better Auth config
    ├── db/         Prisma schema and client
    ├── ui/         shared shadcn/ui components
    └── config/     shared TypeScript config
```
