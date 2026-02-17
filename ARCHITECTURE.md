# Workout Buddy: System Architecture

This document serves as the primary "mental model" for the Workout Buddy codebase. It describes how data flows, how logic is separated, and how the UI interacts with the system.

## 1. High-Level Data Flow (Local-First)
Workout Buddy is a "local-first" application. IndexedDB is the primary source of truth, ensuring the app works flawlessly offline.

**Flow:**
`User Input` → `Views` → `Repository (Singleton)` → `Dexie/IndexedDB` → `Change Listener` → `Cloud Sync (Firebase)`

## 2. Core Layers

### A. Data Layer (`db.ts`, `services/repository.ts`)
- **`db.ts`**: Defines the Dexie schema, handles schema migrations, and seeds canonical exercises (Pillars/Accessories).
- **`repository.ts`**: The central API for the entire app. **NEVER** call the database directly from a component; always use the `repository` singleton.
    - **Data Integrity**: The repository is responsible for side effects like recalculating Personal Records (PRs) and total workout counts when a session is added or deleted.
    - **Reactivity**: Components can subscribe to changes, and the `App` component uses a sync listener here to trigger cloud backups.

### B. Business Logic Layer (`services/`)
We keep the "Brain" of the app separate from the "Face" (UI):
- **`session.ts`**: Pure functions for calculating weights, progression, and "Counted" status during a workout.
- **`recommendations.ts`**: The logic for choosing which Pillars to show next based on rotation scores.
- **`stats.ts`**: Transforms raw session data into chart-ready formats and consistency metrics (e.g., Pillar Weeks Met).

### C. Cloud Layer (`services/auth.ts`, `services/cloud-rest.ts`)
- **Firebase Auth**: Manages user identity.
- **REST Sync**: Periodically pushes the entire local database state to Firebase or pulls it down. This is treated as a **backup/sync mechanism**, not a real-time database.

### D. View Layer (`views/`, `App.tsx`)
- **`App.tsx`**: The orchestrator. Manages the high-level `currentView` (Dashboard, Setup, Session, etc.) and global state like the `activeSession`.
- **View Components**: Flat hierarchy. Views fetch what they need from the `repository` on mount.
- **Overlays**: Complex details (like Pillar coaching cues) are managed via overlays to keep the main view state clean.
- **Minimalism**: The UI follows an "Absolute Minimalist" philosophy, removing non-functional branding in favor of high-density functional data and industrial UI textures. It prioritizes "Proactive Metrics" (e.g., Days Remaining) over passive logs (e.g., Days Since) to drive user action.

## 3. Domain Logic

### The "Counted" Rule
The most critical rule in the app:
- A Pillar rotation only resets if the workout is "Counted."
- **Counted** = Weight performed is ≥ `minWorkingWeight`.
- This prevents "light days" or "warmups" from resetting the rotation timer.

### Progressive Overload
To prevent stagnation, Pillars can opt-in to **Overload Tracking**:
- **Stagnation**: Occurs when `totalWorkouts` (at the current weight) reaches the `overloadThreshold` (default 5).
- **Level Up**: The user is prompted to increase the `minWorkingWeight`.
- **Reset**: Increasing the weight implicitly resets `totalWorkouts` to 0 because historical sessions no longer meet the *new* `minWorkingWeight` threshold (per the "Counted" Rule).

## 4. Testing Philosophy
- **Unit Tests**: Located next to the source (e.g., `repository.test.ts`). Focus on logic and data integrity.
- **Integration Tests** (`tests/integration/`): Focus on the "Golden Path"—starting a workout, completing it, and seeing it in history.
- **Factories** (`tests/factories.ts`): Always use factories to generate mock data to ensure tests stay resilient to schema changes.

## 5. Maintenance Rules
- **Schema Changes**: If you update `db.ts` or `types.ts`, you MUST update this document.
- **New Services**: If you add a file to `/services`, update the Business Logic Layer section.
