import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { formatDateLabel } from "@/lib/dates";
import {
  canAccessAnalytics,
  canAccessManagedAnalyticsScope,
} from "@/lib/permissions";
import { getManagementConsoleView } from "@/lib/services/management-console-service";
import { ManagementConsole } from "./management-console";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canAccessAnalytics(session)) {
    redirect("/dashboard");
  }

  const { view } = await searchParams;
  const canViewManagedScope = canAccessManagedAnalyticsScope(session);
  const selectedMode =
    view === "scope" && canViewManagedScope ? "SCOPE" : "SELF";

  const data = await getManagementConsoleView(session, undefined, selectedMode);

  if (!data) {
    redirect("/dashboard");
  }

  return (
    <ManagementConsole
      view={data}
      dateLabel={formatDateLabel(data.date)}
    />
  );
}
