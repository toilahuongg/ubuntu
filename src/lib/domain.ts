export const APP_NAME = "Nhiem Vu Moi Ngay";
export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

export const ROLES = [
  "ADMIN",
  "TEAM_LEAD",
  "REGIONAL_LEAD",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TASK_FIELD_TYPES = [
  "shortText",
  "longText",
  "number",
  "singleSelect",
  "checkbox",
  "date",
] as const;

export type TaskFieldType = (typeof TASK_FIELD_TYPES)[number];

export type SubmissionValue = string | number | boolean | null;

export type FormFieldOption = {
  label: string;
  value: string;
};

export type TaskFieldDefinition = {
  id: string;
  type: TaskFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FormFieldOption[];
};

export type SessionUser = {
  id: string;
  fullName: string;
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
  ADMIN: "Quản trị hệ thống",
  TEAM_LEAD: "Nhóm trưởng",
  REGIONAL_LEAD: "Khu vực trưởng",
  MEMBER: "Thành viên",
};

export const TASK_FIELD_LABELS: Record<TaskFieldType, string> = {
  shortText: "Văn bản ngắn",
  longText: "Ghi chú dài",
  number: "Số liệu",
  singleSelect: "Chọn một",
  checkbox: "Đánh dấu",
  date: "Ngày",
};

export type SubmissionRecord = Record<string, SubmissionValue>;

export type TemplateBuilderField = TaskFieldDefinition & {
  optionText?: string;
};
