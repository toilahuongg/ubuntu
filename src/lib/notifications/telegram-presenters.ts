import "server-only";

import type { SessionUser } from "@/lib/domain";
import { connectToDatabase } from "@/lib/mongoose";
import {
  SubmissionModel,
  type SubmissionRecordModel,
  TaskModel,
  type TaskRecord,
  UserModel,
  type UserRecord,
} from "@/lib/models";
import { getUserByTelegramId } from "@/lib/services/organization-service";
import { getCosmeticTextIcon } from "@/lib/cosmetics/icon";
import { getEquippedPayloadsForUsers } from "@/lib/services/cosmetics-service";
import { appliesToUser } from "@/lib/tasks/policy";
import { isTaskScheduledForDate } from "@/lib/tasks/schedule";
import { sortTasksForDisplay, taskToScope } from "@/lib/tasks/task-service";
import { getLevelInfo } from "@/lib/level-utils";
import { getLevelFromXp } from "@/lib/xp";

export async function getTelegramTodayDigest(
  telegramId: number,
  dateKey: string,
): Promise<string> {
  await connectToDatabase();

  const rawUser = (await UserModel.findOne({
    telegramId,
  }).lean()) as UserRecord | null;

  if (!rawUser) {
    return "Bạn chưa có tài khoản trong hệ thống. Vui lòng đăng nhập qua web app trước.";
  }
  if (rawUser.status === "PENDING") {
    return "Tài khoản của bạn đang chờ duyệt. Vui lòng liên hệ quản trị viên.";
  }
  if (rawUser.status === "INACTIVE") {
    return "Tài khoản của bạn đã bị khóa.";
  }
  if (!rawUser.teamId) {
    return "Bạn chưa được gán vào nhóm nào.";
  }

  const userShape = {
    teamId: rawUser.teamId?.toString() ?? null,
    zoneId: rawUser.zoneId?.toString() ?? null,
    regionId: rawUser.regionId?.toString() ?? null,
    role: rawUser.role,
  };

  const allTasks = (await TaskModel.find({
    isActive: true,
  })
    .lean()) as TaskRecord[];

  const tasks = sortTasksForDisplay(
    allTasks.filter(
      (t) =>
        isTaskScheduledForDate(t, dateKey) &&
        appliesToUser(taskToScope(t), userShape),
    ),
  );

  if (tasks.length === 0) {
    return `📅 ${dateKey}\nHôm nay chưa có nhiệm vụ nào.`;
  }

  const submissions = (await SubmissionModel.find({
    date: dateKey,
    subjectUserId: rawUser._id,
    taskId: { $in: tasks.map((t) => t._id) },
  }).lean()) as SubmissionRecordModel[];

  const submittedTaskIds = new Set(
    submissions.map((s) => s.taskId.toString()),
  );

  const lines = tasks.map((t) => {
    const done = submittedTaskIds.has(t._id.toString());
    return `${done ? "✅" : "⏳"} ${t.title}`;
  });

  const doneCount = submittedTaskIds.size;
  const total = tasks.length;
  return [
    `📅 Nhiệm vụ hôm nay (${dateKey}) — ${doneCount}/${total}`,
    "",
    ...lines,
  ].join("\n");
}

export async function getTelegramProfile(telegramId: number): Promise<string> {
  await connectToDatabase();
  const user = (await UserModel.findOne({
    telegramId,
  }).lean()) as UserRecord | null;

  if (!user) return "Bạn chưa có tài khoản trong hệ thống.";

  const totalXp = user.totalXp ?? 0;
  const level = user.level ?? getLevelFromXp(totalXp);
  const info = getLevelInfo(level, user.gender ?? "male");

  return [
    `👤 ${user.fullName}`,
    `🎖 Cấp ${level} — ${info.nameVi}`,
    `⭐ Tổng XP: ${totalXp}`,
    `📌 Trạng thái: ${user.status}`,
  ].join("\n");
}

export async function getTelegramLeaderboard(
  telegramId: number,
): Promise<string> {
  await connectToDatabase();
  const user = (await UserModel.findOne({
    telegramId,
  }).lean()) as UserRecord | null;

  if (!user) return "Bạn chưa có tài khoản trong hệ thống.";
  if (!user.teamId) return "Bạn chưa được gán vào nhóm nào.";

  const members = (await UserModel.find({
    status: "ACTIVE",
    teamId: user.teamId,
  })
    .sort({ totalXp: -1, level: -1 })
    .limit(10)
    .lean()) as UserRecord[];

  if (members.length === 0) return "Chưa có thành viên nào trong bảng xếp hạng.";

  const equippedMap = await getEquippedPayloadsForUsers(
    members.map((m) => m._id.toString()),
  );

  const medals = ["🥇", "🥈", "🥉"];
  const lines = members.map((member, index) => {
    const marker = medals[index] ?? `${index + 1}.`;
    const isMe = member._id.toString() === user._id.toString();
    const eq = equippedMap.get(member._id.toString());
    const prefixIcon = getCosmeticTextIcon(eq?.prefix?.payload?.icon);
    const suffixIcon = getCosmeticTextIcon(eq?.suffix?.payload?.icon);
    const prefix = prefixIcon ? `${prefixIcon} ` : "";
    const suffix = suffixIcon ? ` ${suffixIcon}` : "";
    const decorated = `${prefix}${member.fullName}${suffix}`;
    const name = isMe ? `${decorated} (bạn)` : decorated;
    return `${marker} ${name} — ${member.totalXp ?? 0} XP (Lv.${member.level ?? 1})`;
  });

  return ["🏆 Bảng xếp hạng nhóm (Top 10)", "", ...lines].join("\n");
}

export async function getSessionUserByTelegramId(
  telegramId: number,
): Promise<SessionUser | null> {
  const user = await getUserByTelegramId(telegramId);
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}
