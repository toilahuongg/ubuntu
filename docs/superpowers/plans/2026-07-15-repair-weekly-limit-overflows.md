# Repair Weekly Limit Overflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dry-run-first repair script that removes weekly task submissions over `maxPerWeek` from `2026-07-01` onward and deducts matching XP/points.

**Architecture:** Put the overflow selection and reward deduction planning in a testable service module. Keep the CLI script thin: parse `--apply`, connect Mongo, call the service, print the report, and disconnect.

**Tech Stack:** TypeScript, Mongoose models, existing date helper `getWeekRangeFromDateKey(dateKey, 7)`, Vitest.

---

### Task 1: Repair Planner

**Files:**
- Create: `src/lib/tasks/weekly-limit-repair.ts`
- Test: `src/lib/tasks/weekly-limit-repair.test.ts`

- [ ] Write tests for keeping oldest submissions, deleting newer overflows, deleting whole submissions when a single count crosses the limit, and clamping point balance to zero.
- [ ] Implement `planWeeklyLimitRepairs` as a pure function over task/user/submission records.
- [ ] Run `npm test -- src/lib/tasks/weekly-limit-repair.test.ts`.

### Task 2: Database Apply

**Files:**
- Modify: `src/lib/tasks/weekly-limit-repair.ts`

- [ ] Add `repairWeeklyLimitOverflows({ fromDate, apply })` to load weekly tasks with `maxPerWeek`, load submissions from `fromDate`, group by `taskId + subjectUserId + week`, and use the planner.
- [ ] In dry-run, only return report data.
- [ ] In apply mode, delete planned submission ids and decrement `User.totalXp`/`User.pointBalance` with `pointBalance` clamped to zero.

### Task 3: CLI Script

**Files:**
- Create: `src/scripts/repair-weekly-limit-overflows.ts`
- Modify: `package.json`

- [ ] Add `repair:weekly-limits` script.
- [ ] Parse `--apply` and optional `--from=YYYY-MM-DD`, defaulting to `2026-07-01`.
- [ ] Print detail rows by `task + user + week` and a final summary.

### Task 4: Verification

**Files:**
- Test touched code only.

- [ ] Run `npm test -- src/lib/tasks/weekly-limit-repair.test.ts`.
- [ ] Run `npx eslint src/lib/tasks/weekly-limit-repair.ts src/lib/tasks/weekly-limit-repair.test.ts src/scripts/repair-weekly-limit-overflows.ts`.
- [ ] Run dry-run command shape if DB env is available; otherwise report that DB-backed dry-run was not executed.
