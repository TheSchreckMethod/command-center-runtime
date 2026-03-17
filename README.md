# Command Center Runtime v3.1

Autonomous content pipeline for The Schreck Method ecosystem.

## Architecture
- **NestJS** — TypeScript backend framework
- **BullMQ + Redis** — Job queue system (survives crashes, retries, proper status tracking)
- **Supabase** — Persistent Postgres storage (shared with Command Center)
- **OpenAI GPT-4o** — Content generation

## What it does
- Autonomous daily pipeline: topics → briefs → posts → schedule → metrics
- Settings-driven: toggle autonomous mode, safe mode, daily targets
- Job queue with full status tracking and audit logging
- Alert system for low content volume, revenue milestones
- Publisher interfaces for LinkedIn, YouTube, X, Buffer

## Runs alongside schreck-command
This is a SEPARATE service. It shares the same Supabase database but runs independently.

| Service | Port | Purpose |
|---------|------|---------|
| schreck-command | 3000 | Command Center UI, CRM, agents, flywheel |
| command-center-runtime | 3002 | Autonomous content pipeline, job queues |

## Quick start
1. Run the SQL migration: `src/sql/003_runtime_tables.sql`
2. Add Redis to Railway (or use local Redis)
3. Set env vars (see `.env.example`)
4. `npm install && npm run build && npm start`

Strength. Systems. Permanence.
