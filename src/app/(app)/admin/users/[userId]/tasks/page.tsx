import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { canPersonalizeTasks } from "@/lib/permissions";
import { getUserById } from "@/lib/services/organization-service";
import { TaskModel } from "@/lib/models/task";
import { UserTaskVisibilityModel } from "@/lib/models/user-task-visibility";
import { appliesToUser, taskToScope } from "@/lib/tasks/policy";
import { TaskVisibilityList } from "./task-visibility-list";
import { toObjectId } from "@/lib/utils/ids";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function MemberTasksPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const actor = await getSessionUser();
  if (!actor) redirect("/login");

  const targetUser = await getUserById(userId);
  if (!targetUser) redirect("/admin/users");

  if (!canPersonalizeTasks(actor, targetUser)) {
    redirect("/admin/users");
  }

  // Lấy danh sách tất cả nhiệm vụ đang hoạt động trong nhóm
  const tasks = await TaskModel.find({
    isActive: true,
    teamId: toObjectId(targetUser.teamId ?? ""),
  }).lean();

  // Lấy ghi đè cấu hình hiển thị hiện tại
  const overrides = await UserTaskVisibilityModel.find({
    userId: toObjectId(userId),
    taskId: { $in: tasks.map((t) => t._id) },
  }).lean();

  const overrideMap = new Map<string, boolean>(overrides.map((o) => [o.taskId.toString(), o.isVisible]));
  const targetUserShape = {
    teamId: targetUser.teamId,
    zoneId: targetUser.zoneId,
    regionId: targetUser.regionId,
    role: targetUser.role,
  };

  const taskItems = tasks.map((t) => {
    const defaultVisible = appliesToUser(taskToScope(t), targetUserShape);
    const customOverride = overrideMap.get(t._id.toString());
    return {
      id: t._id.toString(),
      title: t.title,
      description: t.description,
      scope: t.scope,
      targetRoles: t.targetRoles || [],
      defaultVisible,
      currentVisible: customOverride !== undefined ? customOverride : defaultVisible,
    };
  });

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold font-display">Cá nhân hóa Nhiệm vụ</h1>
          <p className="text-xs text-muted-foreground">
            Thiết lập hiển thị nhiệm vụ cho {targetUser.fullName} ({targetUser.role})
          </p>
        </div>
      </div>

      <TaskVisibilityList userId={userId} tasks={taskItems} />
    </div>
  );
}
