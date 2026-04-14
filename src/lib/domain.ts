export const APP_NAME = "Nhiệm Vụ Mỗi Ngày";
export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export const ROLES = [
  "TEAM_LEAD",
  "ZONE_LEAD",
  "REGIONAL_LEAD",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

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
  TEAM_LEAD: "Nhóm trưởng",
  ZONE_LEAD: "Địa Vực trưởng",
  REGIONAL_LEAD: "Khu vực trưởng",
  MEMBER: "Thành viên",
};

export const SCOPE_LABELS: Record<TaskScope, string> = {
  TEAM: "Toàn Nhóm",
  ZONE: "Địa Vực",
  REGION: "Khu vực",
};
