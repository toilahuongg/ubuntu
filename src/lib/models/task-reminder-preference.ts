import { model, models, Schema, Types } from "mongoose";

const taskReminderPreferenceSchema = new Schema(
  {
    enabled: { default: true, type: Boolean },
    reminderTime: { required: true, type: String },
    taskId: { index: true, ref: "Task", required: true, type: Schema.Types.ObjectId },
    userId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

taskReminderPreferenceSchema.index(
  { taskId: 1, userId: 1 },
  { unique: true },
);

export type TaskReminderPreferenceRecord = {
  _id: Types.ObjectId;
  enabled: boolean;
  reminderTime: string;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskReminderPreferenceModel =
  models.TaskReminderPreference ||
  model("TaskReminderPreference", taskReminderPreferenceSchema);
