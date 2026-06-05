# Design Spec: KVT Region Progress Link in /admin

## Overview
Currently, the admin dashboard `/admin` for the Regional Lead (KVT - role: `REGIONAL_LEAD`) does not provide a direct link to check the progress of their assigned region. However, a region progress page already exists at `/admin/regions/[regionId]`.
This design details the addition of a "Tiến độ khu vực" (Region Progress) link in `/admin` specifically for KVT users who have a region assigned.

## Requirements
- Add a new navigation item "Tiến độ khu vực" in the `/admin` dashboard for users with the role `REGIONAL_LEAD`.
- The link must target `/admin/regions/$regionId`, where `$regionId` is the `regionId` property of the logged-in user session.
- If the user has the `REGIONAL_LEAD` role but does not have a `regionId` assigned, the link must not be shown.

## Proposed Changes

### [MODIFY] [page.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/app/(app)/admin/page.tsx)
Modify the `scopedStructureItems` variable inside the `!canManageStructure` block:

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

## Verification Plan
### Manual Verification
1. Log in as a user with role `REGIONAL_LEAD` and a valid `regionId`.
2. Navigate to `/admin`.
3. Verify that the "Tiến độ khu vực" card is displayed under the "Cấu trúc trong phạm vi" section.
4. Click the link and verify it redirects to `/admin/regions/$regionId`.
5. Log in as a user with role `REGIONAL_LEAD` but with `regionId` set to null.
6. Navigate to `/admin`.
7. Verify that the "Tiến độ khu vực" card is NOT displayed.
