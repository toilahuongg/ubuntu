import { z } from "zod";

import { TASK_TARGET_ROLES } from "@/lib/domain";
import { DEFAULT_TASK_TYPE, TASK_TYPES } from "@/lib/tasks/constants";
import {
  DEFAULT_TASK_SCHEDULE_TYPE,
  TASK_SCHEDULE_TYPES,
} from "@/lib/tasks/schedule";

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

const taskBaseSchema = z.object({
  deadlineTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Deadline phải theo HH:mm"),
  description: z.string().max(280).optional().default(""),
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
  );

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
