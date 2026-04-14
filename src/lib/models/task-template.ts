import { model, models, Schema, Types } from "mongoose";

import { TEMPLATE_SCOPES, type TemplateScope } from "@/lib/domain";
import { DEFAULT_EXP_REWARD, DEFAULT_LATE_WINDOW_DAYS } from "@/lib/tasks/constants";

const taskTemplateSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    expReward: { default: DEFAULT_EXP_REWARD, min: 0, type: Number },
    lateWindowDays: {
      default: DEFAULT_LATE_WINDOW_DAYS,
      max: 365,
      min: 1,
      type: Number,
    },
    isActive: { default: true, type: Boolean },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    scope: { default: "TEAM", enum: TEMPLATE_SCOPES, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    title: { required: true, trim: true, type: String },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

// Explicit record type. InferSchemaType loses the narrow TemplateScope
// union and marks optional fields as possibly-undefined even though the
// schema supplies defaults — an explicit type removes casts at callers.
export type TaskTemplateRecord = {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  deadlineTime: string;
  description: string;
  expReward: number;
  lateWindowDays: number;
  isActive: boolean;
  regionId: Types.ObjectId | null;
  scope: TemplateScope;
  teamId: Types.ObjectId;
  title: string;
  zoneId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskTemplateModel =
  models.TaskTemplate || model("TaskTemplate", taskTemplateSchema);
