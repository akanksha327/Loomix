# Backend

Production-oriented Express and Prisma API for the social platform.

## Runtime

- Express API entry: `src/server.ts`
- App factory for tests: `src/app.ts`
- Prisma schema: `prisma/schema.prisma`
- Required database: PostgreSQL

## Scripts

Run from the backend directory:

```bash
cd Backend
bun install
bun run db:generate
bun run db:migrate
bun run dev
```

## Environment

Copy `Backend/.env.example` values into the root `.env` for local development. Production must use strong random values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.

## API Groups

- `/api/auth`
- `/api/users`
- `/api/communities`
- `/api/posts`
- `/api/comments`
- `/api/votes`
- `/api/notifications`
- `/api/search`
- `/api/settings`
- `/api/media`
