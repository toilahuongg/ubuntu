import { z } from "zod";

export const taskInputSchema = z
  .object({
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
    isActive: z.boolean().default(true),
    taskType: z.enum(["COUNT_TOTAL", "MONTHLY_PER_MEMBER"]).default(
      "MONTHLY_PER_MEMBER",
    ),
    targetCount: z.number().int().min(1).max(100000).optional(),
    title: z.string().min(3, "Tiêu đề quá ngắn").max(80),
  })
  .refine(
    (v) =>
      v.taskType !== "COUNT_TOTAL" ||
      (typeof v.targetCount === "number" && v.targetCount >= 1),
    {
      message: "Task tổng hợp theo số lần cần nhập mục tiêu ≥ 1.",
      path: ["targetCount"],
    },
  );

export const monthlyGoalInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  yearMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ."),
  targetCount: z.number().int().min(1, "Mục tiêu phải ≥ 1").max(100000),
});

export const submitTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  subjectUserId: z.string().min(1, "Thiếu người nộp."),
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ.")
    .optional(),
});

export const toggleTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
});

export const updateProfileInputSchema = z.object({
  fullName: z.string().min(1, "Biệt danh không được để trống.").max(60),
  gender: z.enum(["male", "female"]).optional(),
  bio: z.string().max(280).optional().default(""),
});
