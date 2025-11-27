---
description: Bootstrap the project with custom configuration, database schemas, and admin pages based on your specific SaaS idea.
argument-hint: [project name]
---

# Indie Kit Project Bootstrapper

You are an expert software architect and developer. Your task is to bootstrap a new SaaS project from this boilerplate based on the user's requirements.

## Phase 1: Information Gathering (Interactive)

**Step 1.1**: Check if the user provided a project name in the arguments.
-   If NOT, ask: "What is the name of your new SaaS project?"
-   If YES, proceed.

**Step 1.2**: Ask for a brief description.
-   "Could you give me a one-sentence description of what [Project Name] does?"

**Step 1.3**: Ask for Theme Preference.
-   "Which visual theme would you like to use? (e.g., Modern Minimal, T3 Chat, Twitter, etc.)"

**Step 1.4**: Ask for Key User Flows / Entities.
-   "What are the core entities or resources in your app? (e.g., for a course platform: 'Courses', 'Lessons', 'Quizzes'. For a project manager: 'Projects', 'Tickets')."
-   "For each entity, clarify:
    1.  Should users manage these in their dashboard? (e.g., `/app/projects`)
    2.  Should Super Admins also manage these?
    3.  Is the main dashboard an overview/stats page or a direct list/form for these entities?"

**Step 1.5**: Ask about Credits.
-   "Does your app use a credit system (e.g., for AI usage)? If yes, what should we call the credit units? (e.g. 'image_generation', 'tokens'). If not, we can skip this."

**Step 1.6**: Ask about AI Integration (If applicable).
-   If the project involves AI, ask for specifics: "Which AI models, platforms, or SDKs will you be using? (e.g., Vercel AI SDK, Replicate, Fal.ai, OpenAI, or a combination?)"

**Step 1.7**: Design & Requirements Deep Dive.
-   "Are there any specific requirement documents or knowledge base items the AI should be aware of?"
-   "Any specific preferences for the Landing Page or App Header design? (e.g., navigation style, specific sections needed)."

## Phase 2: Execution Plan

Once you have the answers, announce the plan: "Great! I'm now going to bootstrap [Project Name]. Here is the plan:"
1.  Update Config (`lib/config.ts` & `lib/credits/config.ts`).
2.  Install Selected Theme.
3.  Create Database Schemas (`db/schema/*.ts`).
4.  Create Admin Forms & APIs (if applicable).
5.  Create User Entity Pages & APIs (`app/(in-app)/app/[entity]/`).
6.  Customize Landing Page (`app/(website-layout)/page.tsx`).
7.  Create In-App Dashboard & Navigation.
8.  Update Component Content & Theme.

**Confirm with the user: "Shall I proceed?"**

## Phase 3: Implementation

After confirmation, execute the following changes. **Do not ask for permission for each file, just do it.**

### 1. Configuration
-   **`src/lib/config.ts`**: Update `projectName`, `description`, and `keywords`.
-   **`src/lib/credits/config.ts`**: If credits are used, update `creditTypeSchema` and `creditsConfig` with the user's types.

### 2. Theme Installation
-   Install the selected theme using the `theme-handler` logic.
-   Run the appropriate command: `pnpm dlx shadcn@latest add <theme-url>` (Refer to `theme-handler` skill for URLs). also give url https://tweakcn.com/editor/theme to user choose theme name from dropdown.

### 3. Database Schema
-   For each entity identified in Step 1.4, create a file `src/db/schema/[entity-name].ts`.
-   Use `drizzle-orm/pg-core` (pgTable, text, timestamp, uuid) and `zod`.
-   **Reference**: Look at `src/db/schema/plans.ts` for style.
-   Ensure columns include `id` (uuid default random), `createdAt`, `updatedAt`, and relevant fields for the entity.

### 4. Super Admin Interface (If requested)
For each entity requiring admin access:
-   **Directory**: `src/app/super-admin/[entity-plural]/`
-   **Pages**: List, Create, Edit.
-   **API**: Standard CRUD routes.

### 5. User Entity Pages & APIs
For each entity requiring user management:
-   **Directory**: `src/app/(in-app)/app/[entity-plural]/`
-   **Pages**:
    -   `page.tsx` (List View)
    -   `create/page.tsx` (Create Form)
    -   `[id]/page.tsx` (Detail/Edit)
    -    use useCredits or useCurrentPlan or useUser to get the user data based on the entity required on client side components.
-   **API Routes**: `src/app/api/app/[entity-plural]/...`
    -   Ensure all queries are scoped to `req.auth.user.id`.
    -   use withAuthRequired in API routes

### 6. Landing Page & Layout
-   **`src/app/(website-layout)/page.tsx`**:
    -   Replace content with a compelling landing page.
    -   Update layout and internal components as needed to look good.
    -   If user opted for credits then use useBuyCredits to customise website-credits-section.
-   **`src/app/(website-layout)/layout.tsx`**:
    -   Update metadata and structure.

### 7. In-App Dashboard & Navigation
-   **`src/app/(in-app)/app/page.tsx`**:
    -   Remove demo content.
    -   Create a professional dashboard (Stats, Recent Items, Quick Actions).
    -   If the user requested a direct form/list as the main view, implement that instead.
-   **`src/components/layout/app-header.tsx`**:
    -   Add navigation links for the new User Entity Pages.
-   **`src/app/(in-app)/layout.tsx`**:
    -   Update the `DashboardSkeleton` to match the new layout and header structure.

### 8. Component Content & Theme
-   Update the content of used components (e.g., hero, features, testimonials) to reflect the project's idea and theme.
-   Adjust the layout and styling if needed to match the specific requirements.

## Completion
Once finished, report back:
"✅ Project [Project Name] has been bootstrapped!
- Config updated.
- Theme installed.
- Schemas created.
- Admin pages created (if applicable).
- User pages & APIs created: [List paths].
- Landing page customized.
- In-app dashboard & Header updated.

### 9. Final Setup
- **Database Migration**: Run `npx drizzle-kit push`.
- **21st.dev Setup**: Run `npx @21st-dev/cli@latest install claude` to install components.
"
