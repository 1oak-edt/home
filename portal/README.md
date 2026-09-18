# 1Oak Deal Portal

Internal sales dashboard, deal pipeline, and CRM for 1Oak Capital. Node/Express backend on Firestore + Firebase Storage, React + Vite frontend.

## Structure

- `server/` — Express API (leads, comments, chat, tasks, documents, alerts, executive-summary upload)
- `client/` — React frontend (pipeline board, deal map, deal record pages, data room)

## Running locally

Requires access to the `oak-portal-bde61` Firebase project. For local dev, authenticate once with:

```bash
gcloud auth application-default login
```

Then:

```bash
npm install
npm run seed -w server
npm run dev
```

Client runs on `localhost:5173`, API on `localhost:4000`.

## Status

Data (leads, comments, chat, tasks, documents, alerts) lives in Cloud Firestore; PDF uploads and executive summaries live in Firebase Storage — both shared and centrally hosted, so any deployment of this backend sees the same live data.

Not yet done:
- **No real login yet.** The header's "Acting as" dropdown is a placeholder — anyone with the URL has full read/write access. Firebase Authentication accounts exist for the team but the client doesn't sign in with them yet.
- **Not deployed anywhere reachable by the team.** This needs a Node host for the Express API (Cloud Run is the plan) plus Firebase Hosting for the built frontend. This repo's GitHub Pages site only serves static files, so it can't run the API on its own.
- AI-powered executive-summary highlight extraction is stubbed until `ANTHROPIC_API_KEY` is set on whatever host runs the server.
