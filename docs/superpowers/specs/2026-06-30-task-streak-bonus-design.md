# Task Streak Bonus Design

## Goal

Reward users when they keep a scheduled daily task streak for 7, 14, 21, or 28 eligible days in the same calendar month.

## Requirements

- A daily per-member task earns its normal task reward when submitted.
- When a submission makes the user's eligible streak reach 7, 14, 21, or 28 days, award an extra bonus using different milestone multipliers:
  - 7 days: `task reward * 2`
  - 14 days: `task reward * 3`
  - 21 days: `task reward * 4`
  - 28 days: `task reward * 5`
- Streaks reset at the calendar-month boundary of the submitted date.
- Scheduled weekly tasks skip unscheduled weekdays when checking continuity. For example, a Monday-Friday task can continue from Friday to Monday without requiring Saturday or Sunday submissions.
- Monthly-scheduled daily tasks only count scheduled month days as eligible days.
- Clearing a submission removes only the normal completion reward, matching current behavior. It does not recalculate or claw back historical streak bonuses.
- If a submission reaches a streak milestone, the client shows a popup notification.

## Architecture

Add a pure streak helper in `src/lib/tasks/streaks.ts`. It receives the task schedule, the submitted date, and completed date keys for the current user/task/month, then returns the current streak and milestone bonus if any.

Integrate the helper inside `saveSubmission` after a successful positive award. The service already owns reward transactions, user balance updates, and the API result shape, so it is the right boundary for bonus creation.

Extend XP and point transaction source enums with streak-specific sources so the ledger remains auditable. The bonus transactions use the task id as `sourceId`, matching normal task rewards.

Client submit components read `streakBonus` from the existing API response and render a small modal-style popup when a milestone bonus is awarded. This keeps the UI localized to existing interactive submit surfaces.

## Data Flow

1. User submits a task through dashboard, task detail, proxy submit, API, or Telegram.
2. `saveSubmission` validates schedule and late window as it does today.
3. If the submission creates a positive completion award, `saveSubmission` queries the user's submissions for the same task in the submitted month.
4. The streak helper computes continuity over eligible scheduled dates ending at the submitted date.
5. At streak milestones, `saveSubmission` writes XP and point bonus transactions, increments the user's balances, updates level if needed, and returns `streakBonus`.
6. Client submit components show a popup when `streakBonus.awarded` is true.

## Error Handling

- Duplicate daily submissions still return without awarding anything.
- Setting a daily submission to zero remains a clear operation and does not award streak bonuses.
- If a task has no XP or point reward, the milestone can be detected but no popup is shown because there is no awarded bonus.
- The helper treats invalid or out-of-month dates as non-contributors.

## Testing

- Unit-test streak calculation for everyday tasks, weekday-only tasks, monthly reset, and milestone detection.
- Unit-test transaction source enums for the new streak sources.
- Run the focused Vitest files first, then run the full test suite if time permits.
