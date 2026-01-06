# Workout Buddy: Potential Projects

This document tracks high-level feature ideas and architectural improvements for Workout Buddy. These projects align with the app's "local-first, minimalist" philosophy.

---

## 1. Auto-Progression Logic ("Level Up")
**Problem:** Users have to manually decide when to increase their `minWorkingWeight`.
**Solution:** Implement a suggestion engine based on performance.
- **Details:** If a user "counts" a Pillar (hits the target weight) 3 times in a row, suggest a 2.5lb or 5lb increase.
- **Value:** Removes decision fatigue and ensures progressive overload.

## 2. Accessory Rotation Tracking
**Problem:** Unlike Pillars, accessories don't have a cadence, so certain exercises (like calves or rear delts) often get neglected for weeks.
**Solution:** Track the "Last Performed" date for every accessory.
- **Details:** In the "Setup Workout" view, display how many days it has been since an accessory was last logged. Highlight "stale" accessories.
- **Value:** Ensures total body development and prevents the user from accidentally skipping the same accessories every session.

## 3. Muscle Group Balance Audit
**Problem:** Rotations can become unintentionally biased toward certain movements.
**Solution:** An analytics widget showing volume distribution.
- **Details:** A "radar" or bar chart showing the ratio of Push vs. Pull vs. Legs vs. Core over the last 30 days.
- **Value:** Helps users maintain a balanced physique and prevent overtraining/injury.

## 4. Plate Calculator Utility
**Problem:** "Gym math" is a minor but constant friction point for barbell exercises.
**Solution:** A quick-access plate breakdown tool.
- **Details:** A small icon next to weight inputs that shows exactly which plates to load on a standard 45lb barbell.
- **Value:** Reduces friction during heavy sessions like Squats or RDLs.

---

## Future Ideas
*Add new ideas below as they arise...*
