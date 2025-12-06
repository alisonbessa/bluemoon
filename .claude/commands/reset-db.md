---
description: Reset the database and clear all data, allowing you to test onboarding and flows from scratch.
argument-hint: [optional: --confirm]
---

# Database Reset Command

This command resets your PostgreSQL database by dropping all tables and schemas, then recreating them from your Drizzle ORM schema definitions.

## Safety Warning ⚠️

**This will permanently delete ALL data in your database.** Use only for development/testing purposes.

## How to Use

```bash
/reset-db                    # Shows confirmation prompt
/reset-db --confirm         # Skips confirmation and resets immediately
```

## What Happens

1. Drops all tables in the database
2. Recreates schema from Drizzle definitions
3. Seeds default groups (essential, lifestyle, personal, investments, goals)
4. Confirms completion

## After Reset

You can now:
- Test the onboarding flow from scratch
- Test multi-user scenarios
- Verify data creation and relationships
- Repeat testing without clearing manually

## Implementation

The reset operation:
1. Connects to your PostgreSQL database using `.env.local` DATABASE_URL
2. Executes a DROP SCHEMA ... CASCADE to remove all tables
3. Runs `drizzle-kit push` to recreate tables
4. Seeds default data (groups) to bootstrap the system

## Prerequisites

- `.env.local` must have valid DATABASE_URL
- You must have write access to the database
- Ensure no other services are accessing the database during reset
