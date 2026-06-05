# Hide Customer Tab for TĐ and Below Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the "Học viên" (Customers) tab from the bottom navigation bar for users with roles "TĐ" (`MEMBER`) and "TĐM" (`TDM`).

**Architecture:** Update the `/customers` item in the navigation configuration array `NAV_ITEMS` in `src/components/bottom-nav.tsx` to include `roles: ["ADMIN", "TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD", "NGV"]`.

**Tech Stack:** Next.js, React, TypeScript.

---

### Task 1: Update Bottom Navigation Configuration

**Files:**
- Modify: `src/components/bottom-nav.tsx:30-34`

- [ ] **Step 1: Modify NAV_ITEMS configuration**

Modify [bottom-nav.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/components/bottom-nav.tsx) to add `roles` to the `/customers` item.

Original lines 30-34:
```typescript
  {
    href: "/customers",
    label: "Học viên",
    icon: Heart,
  },
```

Replacement:
```typescript
  {
    href: "/customers",
    label: "Học viên",
    icon: Heart,
    roles: ["ADMIN", "TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD", "NGV"],
  },
```

- [ ] **Step 2: Run build to verify types and compilation**

Run: `npm run build`
Expected: Successful production build without compilation errors.

- [ ] **Step 3: Commit changes**

Run:
```bash
git add src/components/bottom-nav.tsx
git commit -m "feat: hide customer tab for TĐ and below in bottom navigation bar"
```
