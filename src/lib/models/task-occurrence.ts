import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const taskOccurrenceSchema = new Schema(
  {
    date: { required: true, type: String },
    deadlineAt: { required: true, type: Date },
    reminderSentAt: { default: null, type: Date },
    status: { default: "OPEN", enum: ["OPEN", "CLOSED"], type: String },
    taskTemplateId: { ref: "TaskTemplate", required: true, type: Schema.Types.ObjectId },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

taskOccurrenceSchema.index({ date: 1, taskTemplateId: 1 }, { unique: true });

export type TaskOccurrenceRecord = InferSchemaType<typeof taskOccurrenceSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskOccurrenceModel =
  models.TaskOccurrence || model("TaskOccurrence", taskOccurrenceSchema);
