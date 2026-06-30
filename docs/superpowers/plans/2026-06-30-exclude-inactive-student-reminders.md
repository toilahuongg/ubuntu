# Exclude Inactive Student Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop sending caregiver notifications/reminders for students (customers) who have not interacted for more than 30 days.

**Architecture:** Define a 30-day max inactivity constant `CUSTOMER_INACTIVE_MAX_DAYS = 30`. Apply this limit both in Javascript (`daysSince > 30` filter) and in the MongoDB find query (by querying only students whose last interaction or creation date is within 30 days) for optimal database performance.

**Tech Stack:** Next.js, Mongoose, Vitest

---

### Task 1: Update Customer Reminder Logic and Tests

**Files:**
- Modify: [reminder-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/customer/reminder-service.ts)
- Modify: [reminder-service.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/customer/reminder-service.test.ts)

- [ ] **Step 1: Write the failing tests**

Add the following two tests to the `describe("customer reminder service", ...)` block in `src/lib/customer/reminder-service.test.ts`:

```typescript
  it("skips customers inactive for more than 30 days", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const lastInteraction = new Date("2026-03-05T10:00:00.000Z"); // 36 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ lastInteractionAt: lastInteraction })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });

  it("skips customers created more than 30 days ago with no interactions", () => {
    const sweepAt = new Date("2026-04-10T10:00:00.000Z");
    const createdAt = new Date("2026-03-05T10:00:00.000Z"); // 36 days ago

    const candidates = buildCustomerReminderCandidatesFromData({
      customers: [customer({ createdAt, lastInteractionAt: null })],
      dateKey: "2026-04-10",
      sentLogs: [],
      sweepAt,
      thresholdDays: 3,
      users: [user()],
    });

    expect(candidates).toHaveLength(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/customer/reminder-service.test.ts`
Expected: FAIL with the two new tests failing (returning 1 candidate instead of 0).

- [ ] **Step 3: Write implementation to filter inactive customers**

Modify `src/lib/customer/reminder-service.ts`:

1. Export a new constant:
```typescript
export const CUSTOMER_INACTIVE_MAX_DAYS = 30;
```

2. Update `buildCustomerReminderCandidatesFromData` to skip if `daysSince > CUSTOMER_INACTIVE_MAX_DAYS`:
```typescript
    const daysSince = Math.floor(
      (sweepTime - lastInteractionTime) / (1000 * 60 * 60 * 24),
    );

    if (daysSince < threshold || daysSince > CUSTOMER_INACTIVE_MAX_DAYS) continue;
```

3. Update `getCustomerReminderCandidates` to query only active customers from MongoDB:
```typescript
  const thresholdDate = new Date(sweepAt);
  thresholdDate.setDate(thresholdDate.getDate() - threshold);

  const maxInactiveDate = new Date(sweepAt);
  maxInactiveDate.setDate(maxInactiveDate.getDate() - CUSTOMER_INACTIVE_MAX_DAYS);

  const customers = (await CustomerModel.find({
    $or: [
      {
        lastInteractionAt: {
          $ne: null,
          $gte: maxInactiveDate,
          $lte: thresholdDate,
        },
      },
      {
        $or: [
          { lastInteractionAt: null },
          { lastInteractionAt: { $exists: false } },
        ],
        createdAt: {
          $gte: maxInactiveDate,
          $lte: thresholdDate,
        },
      },
    ],
  }).lean()) as CustomerRecord[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/customer/reminder-service.test.ts`
Expected: PASS (all 10 tests passing).

- [ ] **Step 5: Commit**

Run:
```bash
git add src/lib/customer/reminder-service.ts src/lib/customer/reminder-service.test.ts
git commit -m "feat: exclude customers inactive for more than 30 days from reminders"
```
