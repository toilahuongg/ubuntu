import { z } from "zod";

export const taskInputSchema = z.object({
  deadlineTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Deadline phải theo HH:mm"),
  description: z.string().max(280).optional().default(""),
  expReward: z.number().int().min(0, "EXP không được âm").max(10000).default(10),
  lateWindowDays: z
    .number()
    .int()
    .min(1, "Cửa sổ nhập bù tối thiểu 1 ngày")
    .max(365)
    .default(7),
  isActive: z.boolean().default(true),
  title: z.string().min(3, "Tiêu đề quá ngắn").max(80),
});

export const submitTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
  subjectUserId: z.string().min(1, "Thiếu người nộp."),
});

export const toggleTaskInputSchema = z.object({
  taskId: z.string().min(1, "Thiếu mã nhiệm vụ."),
});

export const updateProfileInputSchema = z.object({
  fullName: z.string().min(1, "Biệt danh không được để trống.").max(60),
  gender: z.enum(["male", "female"]).optional(),
  bio: z.string().max(280).optional().default(""),
});
