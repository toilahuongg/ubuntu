import { z } from "zod";

import { TASK_TARGET_ROLES } from "@/lib/domain";
import { DEFAULT_TASK_TYPE, TASK_TYPES } from "@/lib/tasks/constants";
import {
  DEFAULT_TASK_SCHEDULE_TYPE,
  TASK_SCHEDULE_TYPES,
} from "@/lib/tasks/schedule";
import {
  AGE_BRACKETS,
  HEART_STATUSES,
  INTERACTION_OUTCOMES,
  INTERACTION_TYPES,
  OCCUPATIONS,
  PERSONALITIES,
  SHARED_CONTENTS,
} from "@/lib/customer/constants";
import { GENDERS } from "@/lib/domain";

const targetRolesSchema = z
  .array(z.enum(TASK_TARGET_ROLES))
  .min(1, "Vui lòng chọn ít nhất một vai trò nhận nhiệm vụ.");

const scheduledWeekdaysSchema = z
  .array(z.number().int().min(1).max(7))
  .optional()
  .default([]);

const scheduledMonthDaysSchema = z
  .array(z.number().int().min(1).max(31))
  .optional()
  .default([]);

const externalUrlSchema = z
  .string()
  .trim()
  .max(500, "Liên kết quá dài.")
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Liên kết phải bắt đầu bằng http:// hoặc https://." },
  )
  .optional()
  .default("");

const taskBaseSchema = z.object({
  deadlineTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Deadline phải theo HH:mm"),
  description: z.string().max(280).optional().default(""),
  externalLabel: z.string().trim().max(40).optional().default(""),
  externalUrl: externalUrlSchema,
  expReward: z
    .number()
    .int()
    .min(0, "EXP không được âm")
    .max(10000)
    .default(10),
  pointReward: z
    .number()
    .int()
    .min(0, "Điểm không được âm")
    .max(10000)
    .default(10),
  lateWindowDays: z
    .number()
    .int()
    .min(1, "Cửa sổ nhập bù tối thiểu 1 ngày")
    .max(365)
    .default(7),
  taskType: z.enum(TASK_TYPES).default(DEFAULT_TASK_TYPE),
  scheduleType: z
    .enum(TASK_SCHEDULE_TYPES)
    .default(DEFAULT_TASK_SCHEDULE_TYPE),
  scheduledWeekdays: scheduledWeekdaysSchema,
  scheduledMonthDays: scheduledMonthDaysSchema,
  targetCount: z.number().int().min(1).max(100000).optional(),
  targetRoles: targetRolesSchema,
  title: z.string().min(3, "Tiêu đề quá ngắn").max(80),
  submissionMessage: z.string().max(280).optional().default(""),
  completionMessage: z.string().max(280).optional().default(""),
  maxPerWeek: z.number().int().min(1).max(1000).nullable().optional().default(null),
});

export const taskInputSchema = taskBaseSchema
  .extend({
    isActive: z.boolean().default(true),
  })
  .refine(
    (v) =>
      v.taskType !== "COUNT_TOTAL" ||
      (typeof v.targetCount === "number" && v.targetCount >= 1),
    {
      message: "Task theo số lần cần nhập mục tiêu ≥ 1.",
      path: ["targetCount"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "DAILY_PER_MEMBER" ||
      v.scheduleType !== "WEEKLY" ||
      v.scheduledWeekdays.length > 0,
    {
      message: "Vui lòng chọn ít nhất một thứ trong tuần.",
      path: ["scheduledWeekdays"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "DAILY_PER_MEMBER" ||
      v.scheduleType !== "MONTHLY" ||
      v.scheduledMonthDays.length > 0,
    {
      message: "Vui lòng chọn ít nhất một ngày trong tháng.",
      path: ["scheduledMonthDays"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "WEEKLY_PER_MEMBER" ||
      v.maxPerWeek === null ||
      v.maxPerWeek === undefined ||
      v.maxPerWeek >= 1,
    {
      message: "Giới hạn tuần phải ≥ 1 hoặc để trống.",
      path: ["maxPerWeek"],
    },
  );

export const updateTaskInputSchema = taskBaseSchema
  .extend({
    taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  })
  .refine(
    (v) =>
      v.taskType !== "COUNT_TOTAL" ||
      (typeof v.targetCount === "number" && v.targetCount >= 1),
    {
      message: "Task theo số lần cần nhập mục tiêu ≥ 1.",
      path: ["targetCount"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "DAILY_PER_MEMBER" ||
      v.scheduleType !== "WEEKLY" ||
      v.scheduledWeekdays.length > 0,
    {
      message: "Vui lòng chọn ít nhất một thứ trong tuần.",
      path: ["scheduledWeekdays"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "DAILY_PER_MEMBER" ||
      v.scheduleType !== "MONTHLY" ||
      v.scheduledMonthDays.length > 0,
    {
      message: "Vui lòng chọn ít nhất một ngày trong tháng.",
      path: ["scheduledMonthDays"],
    },
  )
  .refine(
    (v) =>
      v.taskType !== "WEEKLY_PER_MEMBER" ||
      v.maxPerWeek === null ||
      v.maxPerWeek === undefined ||
      v.maxPerWeek >= 1,
    {
      message: "Giới hạn tuần phải ≥ 1 hoặc để trống.",
      path: ["maxPerWeek"],
    },
  );

export const saveDailyCampaignInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ."),
  taskIds: z.array(z.string().min(1)).min(1, "Vui lòng chọn nhiệm vụ."),
});

export const campaignOnlyTaskInputSchema = taskBaseSchema
  .extend({
    isActive: z.boolean().default(true),
  })
  .transform((value) => ({
    ...value,
    taskType: "DAILY_PER_MEMBER" as const,
    scheduleType: DEFAULT_TASK_SCHEDULE_TYPE,
    scheduledWeekdays: [],
    scheduledMonthDays: [],
    targetCount: undefined,
  }));

export const monthlyGoalInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ."),
  targetCount: z.number().int().min(1, "Mục tiêu phải ≥ 1").max(100000),
});

export const taskReminderPreferenceInputSchema = z.object({
  enabled: z.boolean(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Giờ nhắc phải theo HH:mm"),
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
});

export const submitTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  subjectUserId: z.string().min(1, "Thiếu người nộp."),
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
    .optional(),
  count: z
    .number()
    .int("Số lần phải là số nguyên.")
    .min(0, "Số lần không được âm.")
    .max(100, "Số lần tối đa là 100.")
    .optional(),
  mode: z.enum(["increment", "set"]).optional(),
});

export const toggleTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
});

export const moveTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  direction: z.enum(["up", "down"], {
    error: "Hướng sắp xếp không hợp lệ.",
  }),
});

export const updateProfileInputSchema = z.object({
  fullName: z.string().min(1, "Biệt danh không được để trống.").max(60),
  gender: z.enum(["male", "female"]).optional(),
  bio: z.string().max(280).optional().default(""),
});

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Mật khẩu xác nhận không khớp.",
      path: ["confirmPassword"],
    },
  );

// Customer validation schemas
export const customerInputSchema = z.object({
  name: z.string().min(1, "Tên không được để trống.").max(80),
  ageBracket: z.enum(AGE_BRACKETS),
  gender: z.enum(GENDERS),
  occupation: z.enum(OCCUPATIONS),
  personality: z.enum(PERSONALITIES),
  heartStatus: z.enum(HEART_STATUSES).optional(),
  notes: z.string().max(500).optional().default(""),
  caregiverIds: z.array(z.string()).max(3, "Tối đa 3 ngườii chăm sóc.").optional().default([]),
  teamId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
});

export const updateCustomerInputSchema = customerInputSchema.extend({
  customerId: z.string().min(1, "Thiếu mã học viên."),
});

export const customerInteractionInputSchema = z.object({
  customerId: z.string().min(1, "Thiếu mã học viên."),
  caregiverId: z.string().optional().nullable(),
  type: z.enum(INTERACTION_TYPES),
  sharedContent: z.enum(SHARED_CONTENTS).optional().nullable(),
  outcome: z.enum(INTERACTION_OUTCOMES),
  notes: z.string().max(500).optional().default(""),
  date: z.string().optional(),
});

export const updateCustomerInteractionInputSchema =
  customerInteractionInputSchema.extend({
    interactionId: z.string().min(1, "Thiếu mã tương tác."),
  });

export function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}
