---
description: Add a new feature to the project, handling database, API, UI, and integration with existing systems like credits and plans.
argument-hint: [feature name]
---

# Add Feature Command

You are an expert software architect and developer. Your task is to add a new feature to the existing SaaS project, ensuring seamless integration with the current architecture, database, and patterns.

## Phase 1: Information Gathering & Context (Interactive)

**Step 1.1**: Analyze the Request.
-   If the user provided a `[feature name]`, use it.
-   If NOT, ask: "What is the name of the feature you want to add?"

**Step 1.2**: Analyze Existing Context (Silent).
-   **Database**: Read `src/db/schema/` to understand existing entities.
-   **API**: Read `src/app/api/` to understand current patterns (authentication, validation).
-   **Monetization**: Read `src/lib/credits/config.ts` and `src/lib/plans/config.ts` to understand available plans and credit types.
-   **Skills**: Review `.claude/skills/` to know what capabilities are available (e.g., `db-handler`, `ui-handler`, `credits-handler`, `plans-handler`, `email-handler`, etc.).

**Step 1.3**: Ask for Details (Interactive).
-   Ask the user for a detailed use case: "Please describe the primary use case for [Feature Name]. Who uses it and what problem does it solve?"

**Step 1.4**: Deep Dive Questions (Max 4-5).
Based on the context and description, ask up to 5 specific questions to clarify technical requirements. Do not ask generic questions if you can infer the answer.
1.  **Data**: "Does this require storing new data? If so, what are the key fields? (e.g., specific relationships to Users or other entities)."
2.  **UI/UX**: "Where should this feature live in the UI? (e.g., a new Dashboard tab, a public page, or a modal within an existing page?)."
3.  **Monetization**: "Is this feature restricted to specific plans or does it consume credits? (Refer to `credits-handler` and `plans-handler`)."
4.  **Integrations**: "Does this feature need to send emails, upload files, or use AI? (Refer to `email-handler`, `s3-upload-handler`, `ai-handler`)."
5.  (Optional) **Permissions**: "Are there specific role-based access controls (Super Admin vs User)?"

## Phase 2: Execution Plan

Once you have the answers, formulate a comprehensive plan using the available skills.

**Step 2.1**: Propose the Plan.
"Thanks! I have a plan to implement [Feature Name]:"

1.  **Database Schema** (`db-handler`):
    -   List new tables or columns to be added in `src/db/schema/`.
    -   Define relationships.
2.  **API & Logic** (`api-handler` patterns):
    -   Define API routes (`src/app/api/...`).
    -   Define server actions if applicable.
    -   Mention validation (`zod`) and auth checks.
3.  **Monetization & Permissions** (`credits-handler`, `plans-handler`):
    -   Specify if `useCredits` or plan checks are needed.
4.  **User Interface** (`ui-handler`, `form-creator`):
    -   List new components or pages (`src/app/(in-app)/...`).
    -   Mention specific UI patterns (tables, forms, cards).
5.  **Integrations** (e.g., `email-handler`, `s3-upload-handler`):
    -   List any external service integration steps.
    -   Need background processing? use inngest-handler to create a new event and function.

**Confirm with the user: "Shall I proceed with this plan?"**

## Phase 3: Implementation

After confirmation, execute the plan step-by-step. **Do not ask for permission for each individual file.**

### 1. Database Implementation
-   Create/Update schema files in `src/db/schema/` using `db-handler` best practices.
-   Ensure `id`, `createdAt`, `updatedAt` are present.
-   Export schemas correctly.

### 2. Core Logic & API
-   Create API routes or Server Actions.
-   Implement permission checks (`req.auth.user.id`).
-   Implement credit deductions if planned (`credits-handler`).
-   Implement plan gating if planned (`plans-handler`).

### 3. User Interface
-   Create the necessary UI components using `ui-handler` (Shadcn UI).
-   Create forms using `form-creator` (react-hook-form + zod).
-   Ensure the UI is responsive and matches the current theme (`theme-handler`).
-   Add navigation items in `src/components/layout/app-header.tsx` or `src/components/layout/sidebar.tsx` if needed.

### 4. Final Wiring
-   Connect the UI to the API/Actions.
-   Handle loading states and error messages.
-   Update `src/lib/config.ts` if new constants are needed.

## Completion
Report back:
"✅ Feature [Feature Name] has been successfully added!
-   **Database**: [Summary of changes].
-   **API**: [Summary of routes created].
-   **UI**: [Summary of pages/components].
-   **Integrations**: [Summary of credits/plans/etc applied].

### Final Steps
1.  **Database Migration**: Run `npx drizzle-kit push` to apply schema changes.
2.  **Verify**: Check the feature at [URL].
"

