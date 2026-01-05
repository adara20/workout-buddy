## Relevant Files

- `db.ts` - Contains `CANONICAL_ACCESSORIES` and `CANONICAL_DATA_VERSION`.
- `tests/migration.test.ts` - Tests for data migration and seeding.

### Notes

- Unit tests should be alongside the code files.
- Use `npm test -- run` or `npx vitest run` to run tests without watch mode.

## Instructions for Completing Tasks

**IMPORTANT:** Change `- [ ]` to `- [x]` as you complete tasks.

**Mandatory Workflow Rules:**
1.  **Feature Isolation:** You **MUST** ensure new features are isolated and do not break or alter existing functionality. Verify this by running the full suite of existing tests using `npm test -- run`.
2.  **Continuous Verification:** You **MUST** run **ALL** unit tests after completing **each sub-task**. If any test fails (new or existing), you must fix it before proceeding.
3.  **Extensive Testing:** For every new task, sub-task, or piece of logic, you **MUST** write extensive unit tests to cover:
    - **Success cases & Edge cases** (e.g., whitespace handling, case-insensitivity).
    - **Migration Paths:** If changing the database schema, you **MUST** write a migration test that simulates upgrading from a legacy version to the new version to prevent "UpgradeError" or data loss.
    - **Derived State:** If a change affects historical data, verify that derived stats (like PRs or timestamps) recalculate correctly across the whole dataset.
4.  **Type Safety:** You **MUST** run `npx tsc --noEmit` (or the project's equivalent type check) after every major sub-task to ensure no syntax or type regressions.
5.  **Git Safety & No Remote Push:** **NEVER** push to a remote repository (`git push`) without explicit human verification and confirmation of the changes. Always work on a local feature branch.
6.  **Local Commits:** Commit locally after each successful parent task is verified and approved by the user.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Create and checkout a new branch `feature/expanded-accessories`
- [x] 1.0 Update Canonical Data
  - [x] 1.1 In `db.ts`, update `CANONICAL_ACCESSORIES` to include the new list of accessories provided in the requirements. Ensure IDs are consistent and descriptive (e.g., `acc_kb_rdl`).
  - [x] 1.2 In `db.ts`, increment `CANONICAL_DATA_VERSION` by 1 to trigger the seeding logic on next app load.
  - [x] 1.3 **Verify & Test:** Run `npm test -- run` to ensure no syntax errors and that existing tests still pass.
  - [x] 1.4 **Human Review:** Ask the user if this task is complete and for permission to move to the next task.
  - [x] 1.5 **Local Commit:** Commit changes locally (`git commit -m "feat: add expanded list of canonical accessories"`) after approval.
- [x] 2.0 Verification
  - [x] 2.1 Add a new test case in `tests/migration.test.ts` (or create a new test file if appropriate) that specifically checks if `initAppData` adds these new accessories when the version is bumped.
  - [x] 2.2 Run the new test to confirm the migration logic works as expected.
  - [x] 2.3 **Verify & Test:** Run ALL unit tests `npm test -- run` and type check `npx tsc --noEmit`.
  - [x] 2.4 **Human Review & Local Commit**
