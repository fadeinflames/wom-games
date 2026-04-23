# Wheel of Misfortune Platform

Open-source app for SRE incident training games.

## What is included

- Simple auth (email/username + password, no OAuth).
- User-owned game packs and scenarios.
- Public gallery of community packs.
- Leader mode: choose active scenarios and spin only from selected cases.
- JSON import endpoint for fast scenario ingestion.
- Agent skill docs to convert incident notes to importable JSON.

## Tech stack

- Next.js (App Router, TypeScript)
- Prisma + PostgreSQL
- Docker Compose for local run

## Quick start with Docker

```bash
docker compose up --build
```

App: [http://localhost:3000](http://localhost:3000)

Default seeded user:

- `email`: `demo@wom.local`
- `username`: `demo`
- `password`: `demo1234`

## Local run without Docker

1. Start Postgres and set `DATABASE_URL` in `.env`.
2. Run:

```bash
npm install
npm run prisma:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Import format

Schema: [`schemas/wom.scenario.v1.json`](schemas/wom.scenario.v1.json)

The app expects JSON like:

```json
{
  "scenarios": [
    {
      "title": "Scenario title",
      "summary": "Short summary",
      "type": "DNS, NetworkPolicy",
      "difficulty": "MIDDLE",
      "durationMin": 20,
      "contextJson": {},
      "eventsJson": [],
      "hintsJson": [],
      "actionsJson": [],
      "gmScriptJson": null
    }
  ]
}
```

## Agent skill

Skill docs live here:

- [`agent-skill/wom-incident-to-json/SKILL.md`](agent-skill/wom-incident-to-json/SKILL.md)

Use it to convert incident markdown into import-ready JSON.
