# Daily Campaign Design

## Goal

Add a daily campaign feature for each team. A team lead can select existing tasks and reusable campaign-only tasks as the special campaign tasks for a specific day. Eligible users see those tasks in a dedicated dashboard section, and completion reporting shows both per-task status and overall campaign completion.

## Roles

Campaign visibility applies to these technical roles:

- `NGV`
- `REGIONAL_LEAD` (`KVT`)
- `ZONE_LEAD` (`DVT - NQL`)
- `TEAM_LEAD` (`CS - DL`)

Only `TEAM_LEAD` users with a `teamId` can create or edit campaigns and reusable campaign-only tasks for their own team.

## Data Model

Add a `DailyCampaign` model with:

- `teamId`: required team reference.
- `date`: required date key in `YYYY-MM-DD` format.
- `taskIds`: ordered task references included in the campaign.
- `createdBy`: user reference.
- `updatedBy`: user reference.
- timestamps.

Indexes:

- Unique `{ teamId: 1, date: 1 }` to enforce one campaign per team per day.
- `{ date: 1, teamId: 1 }` for dashboard/report lookups.

The campaign does not store completion results. Completion is derived from existing `Submission` records by `taskId`, `date`, and `subjectUserId`.

## Campaign-Only Tasks

Campaign-only tasks are normal `Task` records with a new boolean field named `campaignOnly`.

Rules:

- `campaignOnly: true` tasks never appear in normal dashboard task sections.
- They appear only when included in the `DailyCampaign` for the viewed date.
- They are reusable across multiple daily campaigns.
- They belong to the creator's `teamId`.
- They use `scope: TEAM`.
- They use `taskType: DAILY_PER_MEMBER`.
- They can have `expReward` and `pointReward`.
- They use `targetRoles`, defaulting to `NGV`, `REGIONAL_LEAD`, `ZONE_LEAD`, and `TEAM_LEAD`.
- Only `TEAM_LEAD` users can create or edit campaign-only tasks for their own team.

Existing non-campaign tasks can also be added to a campaign, but only if they are active, belong to the same team, are visible for the campaign date, and apply to at least one campaign role.

## Campaign Lifecycle

Each team has at most one campaign per date.

A `TEAM_LEAD` can create or edit the campaign for the current date in the app timezone. Editing includes adding, removing, and reordering tasks. Campaigns for past dates are read-only to keep historical reports stable.

Campaign dates use the app timezone, currently `Asia/Ho_Chi_Minh`.

## Dashboard Behavior

For eligible users, the dashboard loads the campaign for the viewed date and the user's team.

If a campaign exists:

- Show a section named `Chien dich hom nay` before `Nhiem vu hom nay`.
- Include campaign tasks that apply to the current user.
- Remove campaign tasks from the normal daily section to avoid duplicate cards.

If no campaign exists, the dashboard behaves as it does today.

Campaign-only tasks are excluded from all normal task queries unless they are pulled in through the campaign for that date.

## Completion Rules

Submissions continue to use the current submission system.

For campaign-only tasks:

- Each user can complete the task at most once per day.
- XP and points are awarded through the same task submission flow used today.
- Reusing the same campaign-only task on another date creates separate completion state because submissions are keyed by date.

Overall campaign completion for a user is calculated as complete when the user has completed every campaign task that applies to that user on that date.

## Reporting

Reports show:

- Each visible user's per-task status for the campaign.
- The number of completed campaign tasks for that user.
- Overall campaign completion status.

Report visibility follows the existing hierarchy:

- `NGV`: own result only.
- `REGIONAL_LEAD`: users in their region.
- `ZONE_LEAD`: users in their zone.
- `TEAM_LEAD`: all users in their team.

Reports should derive visible users through the existing organization visibility rules where possible, then filter to campaign roles and campaign task applicability.

## Validation And Errors

Campaign create/update should fail when:

- The actor is not a `TEAM_LEAD` with a `teamId`.
- The campaign date is not the current date.
- A selected task belongs to another team.
- A selected existing task is inactive or not visible for the campaign date.
- A selected task does not apply to any campaign role.
- The selected task list is empty.

Submitting a campaign-only task should fail if the task is not included in a campaign for the submitted date.

## Testing

Add focused tests for:

- `DailyCampaign` uniqueness and task validation.
- `TEAM_LEAD` create/update permission.
- Past campaign read-only behavior.
- Campaign-only tasks excluded from normal dashboard.
- Campaign tasks included in the dedicated dashboard section and excluded from normal daily tasks.
- Campaign completion summary from existing submissions.
- Report visibility for `NGV`, `REGIONAL_LEAD`, `ZONE_LEAD`, and `TEAM_LEAD`.

## Out Of Scope

- Multiple campaigns per team per day.
- Admin-managed global campaign templates.
- Campaign task types other than `DAILY_PER_MEMBER`.
- Editing past campaign task lists.
- Storing separate campaign result snapshots.
