# Zone Lead Personalization Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ĐVT-NQL (ZONE_LEAD) to personalize tasks for member-like users (MEMBER, TDM, NGV) within the same zone.

**Architecture:** Update `canPersonalizeTasks` permission check in `src/lib/permissions.ts` and its tests in `src/lib/permissions.test.ts`.

**Tech Stack:** Next.js, Vitest, TypeScript.

## Global Constraints
- None

---

### Task 1: Update canPersonalizeTasks permission logic and tests

**Files:**
- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/permissions.test.ts`

**Interfaces:**
- Consumes: `SessionUser` and helper functions from `src/lib/permissions.ts`
- Produces: Updated `canPersonalizeTasks` function

- [ ] **Step 1: Write/update the tests in `src/lib/permissions.test.ts` to expect ZONE_LEAD permission**

Modify `src/lib/permissions.test.ts` around lines 318-410. Replace the test block for `canPersonalizeTasks` with:

```typescript
describe("canPersonalizeTasks", () => {
  const subject = {
    fullName: "Member",
    id: "member",
    role: "MEMBER" as const,
    status: "ACTIVE" as const,
    teamId: "team-a",
    zoneId: "zone-a",
    regionId: "region-a",
  };

  it("allows admin and team lead (same team)", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Admin",
          id: "admin",
          role: "ADMIN",
          status: "ACTIVE",
        },
        subject,
      ),
    ).toBe(true);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Team Lead",
          id: "team-lead",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-a",
        },
        subject,
      ),
    ).toBe(true);
  });

  it("allows zone leads for members of the same zone", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Zone Lead",
          id: "zone-lead",
          role: "ZONE_LEAD",
          status: "ACTIVE",
          zoneId: "zone-a",
        },
        subject,
      ),
    ).toBe(true);
  });

  it("denies zone leads from other zones, regional leads, and other scopes", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Regional Lead",
          id: "regional-lead",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          regionId: "region-a",
        },
        subject,
      ),
    ).toBe(false);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Other Team Lead",
          id: "team-lead-other",
          role: "TEAM_LEAD",
          status: "ACTIVE",
          teamId: "team-b",
        },
        subject,
      ),
    ).toBe(false);

    expect(
      canPersonalizeTasks(
        {
          fullName: "Other Zone Lead",
          id: "zone-lead-other",
          role: "ZONE_LEAD",
          status: "ACTIVE",
          zoneId: "zone-b",
        },
        subject,
      ),
    ).toBe(false);
  });

  it("denies zone leads for non-member roles even in the same zone", () => {
    expect(
      canPersonalizeTasks(
        {
          fullName: "Zone Lead",
          id: "zone-lead",
          role: "ZONE_LEAD",
          status: "ACTIVE",
          zoneId: "zone-a",
        },
        {
          fullName: "Regional Lead",
          id: "regional-lead",
          role: "REGIONAL_LEAD",
          status: "ACTIVE",
          zoneId: "zone-a",
        },
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: Failure on "allows zone leads for members of the same zone" and potentially other assertions since ZONE_LEAD is currently denied.

- [ ] **Step 3: Update `canPersonalizeTasks` in `src/lib/permissions.ts`**

Update `canPersonalizeTasks` to handle `ZONE_LEAD`:

```typescript
export function canPersonalizeTasks(actor: SessionUser, subject: SessionUser) {
  if (isAdmin(actor)) return true;
  if (isTeamLead(actor)) {
    return !!actor.teamId && actor.teamId === subject.teamId;
  }
  if (isZoneLead(actor)) {
    return isMemberLike(subject) && !!actor.zoneId && actor.zoneId === subject.zoneId;
  }
  return false;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Run all project tests**

Run: `npm run test`
Expected: 251+ tests pass.

- [ ] **Step 6: Commit changes**

```bash
git add src/lib/permissions.ts src/lib/permissions.test.ts
git commit -m "feat: allow zone leads to personalize tasks for members of the same zone"
```
