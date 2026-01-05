## Relevant Files

- `views/Settings.tsx` - Main component to refactor.
- `views/Settings.test.tsx` - Tests to update and expand.

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
  - [x] 0.1 Create and checkout a new branch `feature/fix-pillar-editing-ux`
- [x] 1.0 Refactor Settings Component
  - [x] 1.1 In `views/Settings.tsx`, introduce a new state variable `editForm` (type `Partial<Pillar> | null`) to hold the temporary changes.
  - [x] 1.2 Update the "Edit" (pencil) button logic: When clicked, set `editForm` to a copy of the selected pillar (initializing the form) and set `editingPillar` ID.
  - [x] 1.3 Update the input fields (Cadence, Weight) and Accessory toggles inside the edit panel to update `editForm` state instead of calling `updatePillar` (DB write).
  - [x] 1.4 Add "Save" and "Cancel" buttons to the edit panel.
    - "Save" calls `repository.putPillar` with `editForm` data, then clears state.
    - "Cancel" clears `editForm` and `editingPillar` state without saving.
  - [x] 1.5 **Verify & Test:** Manually verify the UI flow (if possible) and run `npm test -- run`. Expect existing tests relying on auto-save to fail.
  - [x] 1.6 **Human Review & Local Commit**
- [x] 2.0 Verification & Test Updates
  - [x] 2.1 Update `views/Settings.test.tsx`:
    - Fix existing tests that assume immediate DB updates. They now need to find and click the "Save" button.
    - Add a new test case: "allows making multiple changes and saving once".
    - Add a new test case: "discards changes when cancel is clicked".
  - [x] 2.2 **Verify & Test:** Run ALL unit tests `npm test -- run` and type check `npx tsc --noEmit`. ensure all pass.
  - [x] 2.3 **Human Review & Local Commit**
