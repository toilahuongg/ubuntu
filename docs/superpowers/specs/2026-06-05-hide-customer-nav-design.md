# Hide Customer Tab for TĐ and Below

This design details the change to hide the "Học viên" (Customers) tab from the bottom navigation bar for users with roles "TĐ" (`MEMBER`) and "TĐM" (`TDM`).

## Context
Currently, the bottom navigation bar shows the "Học viên" tab to all users. To restrict the visibility of this tab to management and special roles (specifically hiding it for standard members/tông đồ and new members), we want to restrict it to only:
- `ADMIN` (Admin)
- `TEAM_LEAD` (NT)
- `ZONE_LEAD` (ĐVT)
- `REGIONAL_LEAD` (KVT)
- `NGV` (NTĐ)

## Proposed Changes

### [components/bottom-nav.tsx](file:///Users/devhugon/Desktop/Workspaces/miso-apps/ubuntu/src/components/bottom-nav.tsx)
Add the `roles` property to the `/customers` NavItem:
```typescript
  {
    href: "/customers",
    label: "Học viên",
    icon: Heart,
    roles: ["ADMIN", "TEAM_LEAD", "ZONE_LEAD", "REGIONAL_LEAD", "NGV"],
  },
```

## Verification Plan
1. Log in or run tests as different roles (`ADMIN`, `TEAM_LEAD`, `NGV`, `MEMBER`, `TDM`).
2. Verify that for `MEMBER` and `TDM` the bottom navigation bar does not render the "Học viên" tab.
3. Verify that for other roles the tab is still rendered.
