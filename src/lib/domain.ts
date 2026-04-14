export const APP_NAME = "Nhiệm Vụ Mỗi Ngày";
export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export const ROLES = [
  "TEAM_LEAD",
  "REGIONAL_LEAD",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const GENDERS = ["male", "female"] as const;
export type Gender = (typeof GENDERS)[number];

export type SessionUser = {
  id: string;
  fullName: string;
  gender?: Gender | null;
  bio?: string | null;
  username?: string | null;
  telegramId?: number | null;
  role: Role;
  status: UserStatus;
  teamId?: string | null;
  regionId?: string | null;
};

export type SerializedUser = SessionUser & {
  createdAt?: string;
  updatedAt?: string;
};

export const ROLE_LABELS: Record<Role, string> = {
  TEAM_LEAD: "Nhóm trưởng",
  REGIONAL_LEAD: "Khu vực trưởng",
  MEMBER: "Thành viên",
};
