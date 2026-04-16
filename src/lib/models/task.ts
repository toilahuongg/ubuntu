import { model, models, Schema, Types } from "mongoose";

import { TASK_SCOPES, type TaskScope } from "@/lib/domain";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
  DEFAULT_POINT_REWARD,
  DEFAULT_TASK_TYPE,
  TASK_TYPES,
  type TaskType,
} from "@/lib/tasks/constants";

const taskSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    expReward: { default: DEFAULT_EXP_REWARD, min: 0, type: Number },
    pointReward: { default: DEFAULT_POINT_REWARD, min: 0, type: Number },
    lateWindowDays: {
      default: DEFAULT_LATE_WINDOW_DAYS,
      max: 365,
      min: 1,
      type: Number,
    },
    isActive: { default: true, type: Boolean },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    scope: { default: "TEAM", enum: TASK_SCOPES, type: String },
    taskType: {
      default: DEFAULT_TASK_TYPE,
      enum: TASK_TYPES,
      required: true,
      type: String,
    },
    targetCount: { default: null, min: 1, type: Number },
    completedAt: { default: null, type: Date },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    submissionMessage: { default: "", trim: true, type: String },
    completionMessage: { default: "", trim: true, type: String },
    title: { required: true, trim: true, type: String },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

export type TaskRecord = {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  deadlineTime: string;
  description: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  isActive: boolean;
  regionId: Types.ObjectId | null;
  scope: TaskScope;
  submissionMessage: string;
  completionMessage: string;
  taskType: TaskType;
  targetCount: number | null;
  completedAt: Date | null;
  teamId: Types.ObjectId;
  title: string;
  zoneId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskModel = models.Task || model("Task", taskSchema);
