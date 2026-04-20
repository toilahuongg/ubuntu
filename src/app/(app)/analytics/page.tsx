import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/dates";
import { canAccessAnalytics } from "@/lib/permissions";
import { getManagementConsoleView } from "@/lib/services/management-console-service";
import { ManagementConsole } from "./management-console";

export default async function AnalyticsPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canAccessAnalytics(session)) {
    redirect("/dashboard");
  }

  const view = await getManagementConsoleView(session);

  if (!view) {
    redirect("/dashboard");
  }

  return (
    <ManagementConsole
      view={view}
      dateLabel={formatDateLabel(view.date)}
    />
  );
}
