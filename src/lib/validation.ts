import { z } from "zod";

import {
  TASK_FIELD_TYPES,
  type SubmissionRecord,
  type TaskFieldDefinition,
} from "@/lib/domain";

const optionSchema = z.object({
  label: z.string().min(1, "Thiếu tên tùy chọn").max(40),
  value: z.string().min(1, "Thiếu giá trị tùy chọn").max(40),
});

export const taskFieldSchema = z
  .object({
    helpText: z.string().max(160).optional(),
    id: z.string().regex(/^[a-z0-9_-]+$/, "ID field không hợp lệ"),
    label: z.string().min(1, "Thiếu tên trường").max(80),
    options: z.array(optionSchema).optional(),
    placeholder: z.string().max(120).optional(),
    required: z.boolean().default(false),
    type: z.enum(TASK_FIELD_TYPES),
  })
  .superRefine((field, ctx) => {
    if (field.type === "singleSelect" && (!field.options || field.options.length < 2)) {
      ctx.addIssue({
        code: "custom",
        message: "Field chọn một cần ít nhất 2 tùy chọn",
        path: ["options"],
      });
    }
  });

export const taskTemplateInputSchema = z.object({
  deadlineTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Deadline phải theo HH:mm"),
  description: z.string().max(280).optional().default(""),
  formSchema: z.array(taskFieldSchema).min(1, "Cần ít nhất 1 trường"),
  isActive: z.boolean().default(true),
  title: z.string().min(3, "Tiêu đề quá ngắn").max(80),
});

export function parseTaskSchemaJson(rawSchema: string) {
  const parsed = JSON.parse(rawSchema) as unknown;
  return taskTemplateInputSchema.shape.formSchema.parse(parsed);
}

export function validateSubmissionValues(
  formSchema: TaskFieldDefinition[],
  formData: FormData,
) {
  const values: SubmissionRecord = {};

  for (const field of formSchema) {
    const key = `field-${field.id}`;
    const rawValue = formData.get(key);

    if (field.type === "checkbox") {
      values[field.id] = rawValue === "on";

      if (field.required && values[field.id] !== true) {
        throw new Error(`Trường "${field.label}" cần được đánh dấu.`);
      }

      continue;
    }

    const normalized = rawValue?.toString().trim() ?? "";

    if (!normalized) {
      if (field.required) {
        throw new Error(`Trường "${field.label}" là bắt buộc.`);
      }

      values[field.id] = null;
      continue;
    }

    if (field.type === "number") {
      const parsedNumber = Number(normalized);

      if (Number.isNaN(parsedNumber)) {
        throw new Error(`Trường "${field.label}" cần là số.`);
      }

      values[field.id] = parsedNumber;
      continue;
    }

    if (field.type === "singleSelect") {
      const isAllowed = field.options?.some((option) => option.value === normalized);

      if (!isAllowed) {
        throw new Error(`Giá trị của "${field.label}" không hợp lệ.`);
      }
    }

    values[field.id] = normalized;
  }

  return values;
}
