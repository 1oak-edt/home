# 1Oak Deal Portal

Internal sales dashboard, deal pipeline, and CRM for 1Oak Capital. Node/Express + SQLite backend, React + Vite frontend.

## Structure

- `server/` — Express API (leads, comments, chat, tasks, documents, alerts, executive-summary upload)
- `client/` — React frontend (pipeline board, deal map, deal record pages, data room)

## Running locally

```bash
npm install
npm run seed -w server
npm run dev
```

Client runs on `localhost:5173`, API on `localhost:4000`.

## Status

This currently runs against a local SQLite database and local filesystem storage — fine for local use, not yet wired up for shared/production access by the team. Planned next steps: Firebase Authentication for team logins, a persistent shared database (e.g. Cloud SQL) in place of SQLite, and Firebase Storage in place of local file uploads, deployed behind its own hosting (not this repo's GitHub Pages site, since that only serves static files).
