# Design Spec: Exclude Inactive Student Reminders

We want to stop sending caregiver notifications (reminders) for students (referred to as `customers` in the codebase) who have been inactive (not interacted) for more than 30 days.

## Goals

- Exclude students whose last interaction was more than 30 days ago from caregiver reminders.
- Exclude students who have never interacted and were created more than 30 days ago from caregiver reminders.
- Implement this filtering in both the MongoDB query (for database efficiency) and JS logic (for code-level safety and testability).

## Proposed Changes

### [reminder-service.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/customer/reminder-service.ts)

- Define a new constant `CUSTOMER_INACTIVE_MAX_DAYS = 30`.
- Update `buildCustomerReminderCandidatesFromData` to skip any candidate with `daysSince > CUSTOMER_INACTIVE_MAX_DAYS`.
- Update `getCustomerReminderCandidates` to query only active customers by filtering based on `lastInteractionAt` and `createdAt` relative to `sweepAt - CUSTOMER_INACTIVE_MAX_DAYS`.

### [reminder-service.test.ts](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/lib/customer/reminder-service.test.ts)

- Add a unit test to verify that customers who last interacted more than 30 days ago are skipped.
- Add a unit test to verify that customers who were created more than 30 days ago with no interactions are skipped.

## Verification Plan

### Automated Tests
- Run `npm run test -- src/lib/customer/reminder-service.test.ts` to verify both existing and new tests pass.
