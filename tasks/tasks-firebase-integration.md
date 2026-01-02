## Relevant Files

- `services/auth.ts` - Firebase Auth integration and ID Token retrieval.
- `services/cloud-rest.ts` - Manual sync logic using `fetch` and REST API.
- `services/cloud-rest.test.ts` - Unit tests mocking `fetch` and database state.
- `views/Sync.tsx` - Sync UI with Auth forms and Push/Pull buttons.
- `App.tsx` - Navigation update.

## Instructions for Completing Tasks

**IMPORTANT:** Change `- [ ]` to `- [x]` as you complete tasks.

**Mandatory Workflow Rules:**
1.  **Feature Isolation:** Ensure new REST logic is isolated and does not break existing Dexie.js features.
2.  **Continuous Verification:** Run **ALL** unit tests after every sub-task.
3.  **Extensive Testing:** Mock `fetch` and `auth` to test success, token expiration, and network errors.
4.  **Git Safety:** No remote pushes without human confirmation.

---

## Tasks

### 0.0 Human Setup (MUST BE DONE FIRST)
- [x] 0.1 **Human:** Enable "Realtime Database" in Firebase Console.
- [x] 0.2 **Human:** Set Rules: `{"rules": { "users": { "$uid": { ".read": "$uid === auth.uid", ".write": "$uid === auth.uid" } } } }`
- [x] 0.3 **Human:** Add `VITE_FIREBASE_DATABASE_URL` to `.env` (e.g., `https://my-db.firebaseio.com/`).

### 1.0 Initialize Auth & Token Service
- [x] 1.1 **AI:** Update `services/auth.ts` to include a `getToken()` method using `auth.currentUser?.getIdToken()`.
- [x] 1.2 **AI:** **Verify & Test:** Run tests to ensure auth persists and tokens are retrievable.
- [x] 1.3 **Local Commit:** `git commit -m "feat: add token retrieval to auth service"`

### 2.0 Implement REST Sync Service
- [x] 2.1 **AI:** Create `services/cloud-rest.ts` with `uploadToCloud` (`PUT`) and `downloadFromCloud` (`GET`) methods.
- [x] 2.2 **AI:** Implement data serialization: Convert Dexie tables to a single JSON object for backup.
- [x] 2.3 **AI:** **Verify & Test:** Create `services/cloud-rest.test.ts`. Mock `fetch`. Test large JSON payloads and 401 Unauthorized handling.
- [x] 2.4 **Local Commit:** `git commit -m "feat: implement manual REST sync service"`

### 3.0 Build Sync UI & Navigation
- [x] 3.1 **AI:** Create `views/Sync.tsx` with Login/Signup and Manual Sync buttons.
- [x] 3.2 **AI:** Update `App.tsx` navigation.
- [x] 3.3 **AI:** Add loading states and success/error notifications for REST calls.
- [x] 3.4 **AI:** **Verify & Test:** Ensure navigation works and local history remains unaffected.
- [x] 3.5 **Local Commit:** `git commit -m "ui: add sync view and navigation"`

### 4.0 Final Verification

- [x] 4.1 **AI:** Perform manual end-to-end test with user `a@a.com`.

- [x] 4.2 **AI:** Run full regression suite (`npm test`).

- [x] 4.3 **Human:** Final review and approval for remote push.
