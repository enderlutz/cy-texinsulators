# Frontend — Insulation Hiring Dashboard

Vite + React + TypeScript + shadcn/ui + Tailwind. See `../README.md` for full deploy + setup.

## Local
```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev
```

## Routes
- `/pipeline` — kanban board, drag cards across stages
- `/jobs` — job composer + list
- `/applicants/:id` — detail drawer, screening responses, send SMS/email, change stage
