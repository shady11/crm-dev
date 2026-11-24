# CRM Dev

Web CRM for real estate construction developers.

Stack:
- React
- Vite
- shadcn/ui
- Node.js
- NestJS
- PostgreSQL
- Prisma

## Development with Docker

Requires Docker with Compose v2. Runs PostgreSQL, the API (NestJS watch mode)
and the web app (Vite) with source bind-mounted, so edits hot-reload.

```bash
docker compose up --build                     # first run (later: docker compose up)
docker compose exec api npx prisma db seed    # demo data: admin@crm.dev / password123
docker compose exec -e DEMO_LOCALE=ru api npx prisma db seed   # the same demo data in Russian (on an empty database)
```

| Service | URL |
| --- | --- |
| Web | http://localhost:5173 |
| API | http://localhost:3000/api |
| API docs | http://localhost:3000/api/docs |
| PostgreSQL | `postgresql://postgres:password@localhost:5432/crm_dev` |

Pending migrations are applied automatically when the API container starts.
Common tasks:

```bash
docker compose exec api npx prisma migrate dev --name <change>   # new migration
docker compose exec api npm test                                 # API unit tests
docker compose logs -f api                                       # follow API logs
docker compose down -v                                           # stop and wipe the database
```

Dependencies are installed inside the containers (named volumes), and are
reinstalled automatically when a `package-lock.json` changes. Host ports can be
changed with `DB_PORT`, `API_PORT` and `WEB_PORT` (e.g. in a root `.env` file);
if you change `API_PORT` or `WEB_PORT`, also set `VITE_API_URL` / `FRONTEND_URL` to match.
