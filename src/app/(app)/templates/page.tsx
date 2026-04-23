import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";
import { canManageTasks } from "@/lib/permissions";
import { listTasksForActor } from "@/lib/tasks/task-service";
import { getTemplateCoverageForActor } from "@/lib/tasks/dashboard-service";
import { getTodayDateKey } from "@/lib/dates";
import { SCOPE_LABELS } from "@/lib/domain";
import { TemplateList } from "./template-list";
import { CreateTemplateForm } from "./create-template-form";

export default async function TemplatesPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!canManageTasks(session)) {
    redirect("/dashboard");
  }

  const [tasks, coverage] = await Promise.all([
    listTasksForActor(session),
    getTemplateCoverageForActor(session, getTodayDateKey()),
  ]);

  const actorScope =
    session.role === "ADMIN"
      ? null
      : session.role === "REGIONAL_LEAD"
      ? "REGION"
      : session.role === "ZONE_LEAD"
        ? "ZONE"
        : session.role === "TEAM_LEAD"
          ? "TEAM"
          : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Nhiệm Vụ</h1>
      </div>

      {actorScope ? (
        <CreateTemplateForm scopeLabel={SCOPE_LABELS[actorScope]} />
      ) : (
        <div className="glass-card p-4 text-sm text-muted-foreground">
          Admin có thể xem và chỉnh sửa toàn bộ nhiệm vụ. Để tạo mới, hãy dùng
          tài khoản quản lý đúng phạm vi nhóm, địa vực hoặc khu vực.
        </div>
      )}

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Danh sách ({tasks.length})
        </h2>
        <TemplateList tasks={tasks} coverage={coverage} />
      </section>
    </div>
  );
}
