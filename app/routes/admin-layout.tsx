import Page from "app/(app)/admin/layout";
import { Outlet } from "react-router";

export function ServerComponent() {
  return (
    <Page>
      <Outlet />
    </Page>
  );
}
