# HiveBudget

Planejamento financeiro colaborativo para casais e familias.

## Stack

- Next.js 16 + React 19
- PostgreSQL (Neon) + Drizzle ORM
- Stripe (pagamentos)
- Inngest (jobs agendados)
- Resend (emails)
- Sentry (monitoramento)

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in the values
3. Run `pnpm install`
4. Run `pnpm db:push` to create database tables
5. Run `pnpm db:seed-plans` to seed subscription plans
6. Run `pnpm dev`

## Scripts

- `pnpm dev` - Start development server with Inngest and React Email
- `pnpm build` - Build for production
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed-plans` - Seed subscription plans
- `pnpm db:reset` - Reset database (destructive)
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript checker

## License

This project is licensed under the [Custom License](License.md).
