import { model, models, Schema, Types } from "mongoose";

const reminderLogSchema = new Schema(
  {
    date: { required: true, type: String },
    sentAt: { default: () => new Date(), type: Date },
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

reminderLogSchema.index(
  { taskId: 1, userId: 1, date: 1 },
  { unique: true },
);

export type ReminderLogRecord = {
  _id: Types.ObjectId;
  date: string;
  sentAt: Date;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const ReminderLogModel =
  models.ReminderLog || model("ReminderLog", reminderLogSchema);
