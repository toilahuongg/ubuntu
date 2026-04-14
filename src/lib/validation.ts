import { z } from "zod";

export const taskTemplateInputSchema = z.object({
  deadlineTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Deadline phải theo HH:mm"),
  description: z.string().max(280).optional().default(""),
  expReward: z.number().int().min(0, "EXP không được âm").max(10000).default(10),
  isActive: z.boolean().default(true),
  title: z.string().min(3, "Tiêu đề quá ngắn").max(80),
});
