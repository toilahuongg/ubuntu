# DTT Class Weekly Leaderboard Final Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve schema validation, authorization, podium customizable unit suffix, layout container width, and dead-end page UX issue for the DTT Class Weekly Leaderboard features.

**Architecture:** Use Mongoose validators `{ runValidators: true }` on update, check class membership to manager's team in leaderboard server page, implement optional `unit` prop down the component hierarchy in `Podium`, make grid column classes in `DttLeaderboardFilters` conditional based on class selector visibility, and add Link/wrapper elements to unauthorized/un-enrolled students.

**Tech Stack:** Next.js, React, Tailwind CSS, TypeScript, Mongoose, Vitest.

## Global Constraints
- Target Node.js & Next.js environment.
- Strict type-safety, resolving any `no-explicit-any` ESLint errors.
- Ensure 100% test coverage passes.

---

### Task 1: Enable Mongoose Validators on Class Update

**Files:**
- Modify: `src/app/(app)/admin/dtt/actions.ts`

**Interfaces:**
- Consumes: `findOneAndUpdate` from Mongoose and `DttClassModel`.
- Produces: Mongoose validation on update.

- [ ] **Step 1: Write/Update the implementation in actions.ts**
  Add `{ runValidators: true }` to the options of `findOneAndUpdate` on `DttClassModel` in `updateClassAction`.
- [ ] **Step 2: Run tests to verify the change works**
  Run: `npm run test`
  Expected: All tests pass.
- [ ] **Step 3: Commit changes**
  ```bash
  git add src/app/(app)/admin/dtt/actions.ts
  git commit -m "fix(admin-dtt): enable mongoose schema validation on class update"
  ```

---

### Task 2: Fix Broken Object Level Authorization (BOLA) in Leaderboard Page

**Files:**
- Modify: `src/app/(app)/dtt/leaderboard/page.tsx`
- Modify: `src/app/(app)/dtt/leaderboard/page.test.ts`

**Interfaces:**
- Consumes: `classes` array and `classParam`.
- Produces: Authorized `activeClassId` check.

- [ ] **Step 1: Write implementation in page.tsx**
  Import `DttClassRecord` from `@/lib/models/dtt-class`.
  Change `let classes: any[] = [];` to `let classes: DttClassRecord[] = [];`.
  Verify that the selected `classParam` exists in `classes`. Fallback to the first class if not.
- [ ] **Step 2: Fix ESLint no-explicit-any error in page.test.ts**
  Replace `any` in `canManageDtt` mock parameter with `unknown`.
- [ ] **Step 3: Write tests for BOLA fallback behavior**
  Add a unit test in `src/app/(app)/dtt/leaderboard/page.test.ts` that ensures when `classParam` does not belong to the manager's team classes, it falls back to the first class in the team list.
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm run test`
  Expected: PASS
- [ ] **Step 5: Run linter to verify no any errors**
  Run: `npm run lint`
  Expected: No new lint errors in the modified files.
- [ ] **Step 6: Commit changes**
  ```bash
  git add src/app/(app)/dtt/leaderboard/page.tsx src/app/(app)/dtt/leaderboard/page.test.ts
  git commit -m "security(dtt-leaderboard): fix broken object level authorization (BOLA) for manager classes"
  ```

---

### Task 3: Support Customizable Suffix Units on Podium/Leaderboards

**Files:**
- Modify: `src/app/(app)/leaderboard/podium.tsx`
- Modify: `src/app/(app)/dtt/leaderboard/page.tsx`

**Interfaces:**
- Consumes: Optional `unit` prop in `Podium`, `PodiumReviewCard`, `MobilePodiumCard`, `XpValue`, and `ScoreStand`.
- Produces: Rendered suffix unit on podium score stands and lists.

- [ ] **Step 1: Update Podium and its sub-components**
  In `src/app/(app)/leaderboard/podium.tsx`:
  - Add optional `unit?: string` to `Podium` component props (defaulting to `"điểm"`).
  - Add optional `unit?: string` to `PodiumReviewCard` component props.
  - Update `MobilePodiumCard`, `XpValue`, and `ScoreStand` to receive `unit?: string`.
  - Replace hardcoded `"điểm"` with the `unit` variable in the components.
- [ ] **Step 2: Update leaderboard page.tsx to pass the appropriate unit**
  In `src/app/(app)/dtt/leaderboard/page.tsx`:
  - Determine `unit` based on `taskParam`: if it is set and not `"weekly-total"`, `unit` is `"lần"`; otherwise, `unit` is `"điểm"`.
  - Pass `unit={unit}` to the `Podium` component.
- [ ] **Step 3: Run tests to verify the changes**
  Run: `npm run test`
  Expected: PASS
- [ ] **Step 4: Commit changes**
  ```bash
  git add src/app/(app)/leaderboard/podium.tsx src/app/(app)/dtt/leaderboard/page.tsx
  git commit -m "feat(leaderboard): support customizable suffix units on podium and list entries"
  ```

---

### Task 4: Layout and Navigation improvements

**Files:**
- Modify: `src/app/(app)/dtt/leaderboard/dtt-leaderboard-filters.tsx`
- Modify: `src/app/(app)/dtt/leaderboard/page.tsx`

**Interfaces:**
- Consumes: Tailwind classes for conditional grid layout and beautiful UI button link.
- Produces: Conditional filter columns and an enhanced dead-end page.

- [ ] **Step 1: Update columns grid conditionally in filter component**
  In `src/app/(app)/dtt/leaderboard/dtt-leaderboard-filters.tsx`:
  Replace the static grid-cols classes with a conditional check based on `showClassSelect` and `classes.length > 0`.
- [ ] **Step 2: Add styling wrapper and return button to dead-end page**
  In `src/app/(app)/dtt/leaderboard/page.tsx`:
  Import `Link` from `next/link`.
  In the `!isManager && !enrollment` branch, return a card with nice wrapper styles (e.g. glass-card or warning alert) and a return button (e.g., secondary or gradient styled button link) to return to `/leaderboard` or `/dashboard`.
- [ ] **Step 3: Run tests to check for regressions**
  Run: `npm run test`
  Expected: PASS
- [ ] **Step 4: Run linter to ensure high code quality**
  Run: `npm run lint`
  Expected: No lint errors in our modified files.
- [ ] **Step 5: Commit changes**
  ```bash
  git add src/app/(app)/dtt/leaderboard/dtt-leaderboard-filters.tsx src/app/(app)/dtt/leaderboard/page.tsx
  git commit -m "style(dtt-leaderboard): improve filter grid layout and dead-end page UX"
  ```
