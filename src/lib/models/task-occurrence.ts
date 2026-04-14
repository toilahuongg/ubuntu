import { model, models, Schema, Types } from "mongoose";

import { TEMPLATE_SCOPES, type TemplateScope } from "@/lib/domain";
import type { OccurrenceStatus } from "@/lib/tasks/types";

const OCCURRENCE_STATUSES: OccurrenceStatus[] = ["OPEN", "LOCKED"];

const taskOccurrenceSchema = new Schema(
  {
    date: { required: true, type: String },
    deadlineAt: { required: true, type: Date },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    reminderSentAt: { default: null, type: Date },
    scope: { default: "TEAM", enum: TEMPLATE_SCOPES, type: String },
    status: {
      default: "OPEN",
      enum: OCCURRENCE_STATUSES,
      type: String,
    },
    taskTemplateId: {
      ref: "TaskTemplate",
      required: true,
      type: Schema.Types.ObjectId,
    },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

taskOccurrenceSchema.index(
  { date: 1, taskTemplateId: 1 },
  { unique: true },
);

export type TaskOccurrenceRecord = {
  _id: Types.ObjectId;
  date: string;
  deadlineAt: Date;
  regionId: Types.ObjectId | null;
  reminderSentAt: Date | null;
  scope: TemplateScope;
  status: OccurrenceStatus;
  taskTemplateId: Types.ObjectId;
  teamId: Types.ObjectId;
  zoneId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskOccurrenceModel =
  models.TaskOccurrence || model("TaskOccurrence", taskOccurrenceSchema);
