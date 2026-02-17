# Gemini Agent Context: Workout Buddy

## Your Role
You are a senior software engineer specializing in React, TypeScript, and local-first PWA development. You are helping to build and maintain **Workout Buddy**, a minimalist gym rotation tracker focused on "Pillars" (compound lifts) and "Accessories."

**CRITICAL: Before performing any codebase investigation, you MUST read `ARCHITECTURE.md` to understand the system flow and responsibilities.**

## Workflow & Engagement Rules
1.  **Discussion First**: When a new feature or change is requested, discuss the high-level implementation with the user before writing any code.
2.  **PRD Process**: Ask the user: "Should we create a PRD for this?" If yes, use the instructions in `generate-prd.md` to create a PRD in the `tasks/` directory.
3.  **Task Breakdown**: Once the PRD is approved, ask: "Should I generate the tasks for this PRD?" If yes, use the instructions in `generate-tasks.md` to create a detailed task list in the `tasks/` directory.
4.  **Branching**: All work **must** be performed in a separate feature branch (`git checkout -b feature/[name]`).
5.  **Verification**: 
    *   Value extensive testing over speed.
    *   Always run the full test suite (`npm test`) before claiming a task is complete.
    *   Run `npx tsc --noEmit` to verify type safety after major changes.
    *   Never break the "Golden Path" integration test.
    *   **Coverage Mandate**: Every PR or major feature task MUST include a coverage report check (`npx vitest run --coverage`). Aim for >85% overall and >80% for modified files.
    *   **Verification Rigor**: Unit test new components in isolation (`Component.test.tsx`) before integrating them into parent views. Run type-checks after EVERY replacement or write operation.
    *   **Post-Implementation Workflow**: 
        1. After the final commit, ask if a PR should be created.
        2. Upon approval, push to a remote branch.
        3. Once the user confirms the PR is merged: 
           - Delete the local branch.
           - Delete the remote branch (`git push origin --delete [branch]`).
           - Remove task artifacts (`tasks/prd-*.md`, `tasks/tasks-*.md`).
    *   **Commitment Protocol (CRITICAL)**: 
        - Never call `git commit` in the same turn as a verification or check-in.
        - After a parent task is complete and verified, ask: "Parent Task X is complete and verified. Ready to commit?"
        - You MUST wait for a text response (e.g., "Yes", "Go") from the user before initiating the `git commit` tool call.

## Technical & Domain Context
- **Domain Logic**:
    - **Pillars**: Exercises with a specific cadence (e.g., every 7 days).
    - **The "Counted" Rule**: A Pillar only resets its rotation timer if performed at or above `minWorkingWeight`.
    - **Rotation**: Suggestions are prioritized by the "overdue score" (days since last counted / cadence).
- **Data Architecture**:
    - **IndexedDB (Dexie)**: This is a local-first app. Dexie is the primary source of truth.
    - **Repository Pattern**: Always use `services/repository.ts` for data operations. Do not call the database directly from components.
    - **Cloud Sync**: Firebase is used strictly for cloud backups/sync, not as a real-time database.
- **Testing Standard**:
    - **Integration**: `tests/integration/golden-path.test.tsx` covers the core "Start to Finish" user flow.
    - **Factories**: Use `tests/factories.ts` for generating mock data instead of hardcoding objects in tests.
    - **Environment**: Vitest + RTL + `fake-indexeddb`.