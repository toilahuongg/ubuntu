# KVT Region Progress Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Tiến độ khu vực" navigation link on the `/admin` page for users with the `REGIONAL_LEAD` role that redirects to their specific region page `/admin/regions/$regionId`.

**Architecture:** Update the `scopedStructureItems` logic inside the `!canManageStructure` branch in `src/app/(app)/admin/page.tsx` to conditionally include the link.

**Tech Stack:** Next.js (App Router), React, Lucide React icons, TypeScript.

---

### Task 1: Update admin/page.tsx

**Files:**
- Modify: `src/app/(app)/admin/page.tsx`

- [ ] **Step 1: Modify scopedStructureItems assignment**

Update the `scopedStructureItems` variable assignment in `src/app/(app)/admin/page.tsx` around line 73:

```typescript
    const scopedStructureItems: NavItem[] = isZoneLead
      ? [
          {
            href: "/admin/regions",
            icon: MapPin,
            label: "Khu vực",
            description: "Quản lý các khu vực trong địa vực",
          },
        ]
      : isRegionalLead && session.regionId
      ? [
          {
            href: `/admin/regions/${encodeURIComponent(session.regionId)}`,
            icon: MapPin,
            label: "Tiến độ khu vực",
            description: "Xem tiến độ thành viên trong khu vực quản lý",
          },
        ]
      : [];
```

- [ ] **Step 2: Run verification commands**

Run Next.js build or TypeScript compilation check:
Command: `npm run build` or `npx tsc --noEmit`
Expected output: No compilation errors.

- [ ] **Step 3: Commit changes**

Command:
```bash
git add src/app/\(app\)/admin/page.tsx
git commit -m "feat: add region progress link for KVT in admin dashboard"
```
