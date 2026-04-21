export const APP_NAME = "Ubuntu";
export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export const ROLES = [
  "ADMIN",
  "TEAM_LEAD",
  "ZONE_LEAD",
  "REGIONAL_LEAD",
  "NGV",
  "MEMBER",
] as const;

export const TASK_TARGET_ROLES = [
  "TEAM_LEAD",
  "ZONE_LEAD",
  "REGIONAL_LEAD",
  "NGV",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

export const MEMBER_LIKE_ROLES = ["NGV", "MEMBER"] as const satisfies readonly Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export type TaskTargetRole = (typeof TASK_TARGET_ROLES)[number];

function isTaskTargetRole(value: unknown): value is TaskTargetRole {
  return (
    typeof value === "string" &&
    (TASK_TARGET_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeTargetRoles(
  targetRoles?: readonly string[] | null,
): TaskTargetRole[] {
  const roles = (targetRoles ?? []).filter(isTaskTargetRole);
  if (roles.length === 0) return [...TASK_TARGET_ROLES];
  return TASK_TARGET_ROLES.filter((role) => roles.includes(role));
}

export function targetsAllRoles(
  targetRoles: readonly TaskTargetRole[],
): boolean {
  return TASK_TARGET_ROLES.every((role) => targetRoles.includes(role));
}

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export const TASK_SCOPES = ["TEAM", "ZONE", "REGION"] as const;
export type TaskScope = (typeof TASK_SCOPES)[number];

export type SessionUser = {
  id: string;
  fullName: string;
  gender?: Gender | null;
  bio?: string | null;
  username?: string | null;
  telegramId?: number | null;
  googleId?: string | null;
  email?: string | null;
  role: Role;
  status: UserStatus;
  teamId?: string | null;
  zoneId?: string | null;
  regionId?: string | null;
};

export type SerializedUser = SessionUser & {
  createdAt?: string;
  updatedAt?: string;
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEAM_LEAD: "NT",
  ZONE_LEAD: "ĐV",
  REGIONAL_LEAD: "KVT",
  NGV: "NGV",
  MEMBER: "Thành viên",
};

export const SCOPE_LABELS: Record<TaskScope, string> = {
  TEAM: "Toàn Nhóm",
  ZONE: "Địa Vực",
  REGION: "Khu vực",
};
