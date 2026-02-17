# Workout Buddy: Potential Projects

This document tracks high-level feature ideas and architectural improvements for Workout Buddy. These projects align with the app's "local-first, minimalist" philosophy.

---

## 1. Accessory Rotation Tracking
**Problem:** Unlike Pillars, accessories don't have a cadence, so certain exercises (like calves or rear delts) often get neglected for weeks.
**Solution:** Track the "Last Performed" date for every accessory.
- **Details:** In the "Setup Workout" view, display how many days it has been since an accessory was last logged. Highlight "stale" accessories.
- **Value:** Ensures total body development and prevents the user from accidentally skipping the same accessories every session.

## 2. Plate Calculator Utility
**Problem:** "Gym math" is a minor but constant friction point for barbell exercises.
**Solution:** A quick-access plate breakdown tool.
- **Details:** A small icon next to weight inputs that shows exactly which plates to load on a standard 45lb barbell.
- **Value:** Reduces friction during heavy sessions like Squats or RDLs.

## 3. Minimalist Rest Timer
**Problem:** Users often lose track of rest periods between heavy sets, leading to inconsistent performance.
**Solution:** A simple, non-intrusive rest timer in the `ActiveSession` view.
- **Details:** A small timer that can be started manually or triggered automatically after logging a set. It should provide a gentle visual or haptic cue when the time is up.
- **Value:** Improves session consistency without adding complex workout tracking overhead.

## 4. Workout Templates
**Problem:** Selecting the same set of Pillars and Accessories for recurring workout types (e.g., "Leg Day") is repetitive.
**Solution:** Allow users to save and load "Templates" in the `SetupWorkout` view.
- **Details:** A "Save as Template" button in the setup view and a list of saved templates to quickly pre-populate the current session.
- **Value:** Speeds up the "time to lift" and reduces friction for users with fixed routines.

---

## Future Ideas
*Add new ideas below as they arise...*
