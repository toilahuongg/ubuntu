import { model, models, Schema, Types } from "mongoose";

import {
  TASK_TARGET_ROLES,
  TASK_SCOPES,
  type TaskTargetRole,
  type TaskScope,
} from "@/lib/domain";
import {
  DEFAULT_EXP_REWARD,
  DEFAULT_LATE_WINDOW_DAYS,
  DEFAULT_POINT_REWARD,
  DEFAULT_TASK_TYPE,
  TASK_TYPES,
  type TaskType,
} from "@/lib/tasks/constants";
import {
  TASK_SCHEDULE_TYPES,
  type TaskScheduleType,
} from "@/lib/tasks/schedule";

const taskSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    externalLabel: { default: "", maxlength: 40, trim: true, type: String },
    externalUrl: { default: "", trim: true, type: String },
    expReward: { default: DEFAULT_EXP_REWARD, min: 0, type: Number },
    pointReward: { default: DEFAULT_POINT_REWARD, min: 0, type: Number },
    lateWindowDays: {
      default: DEFAULT_LATE_WINDOW_DAYS,
      max: 365,
      min: 1,
      type: Number,
    },
    sortOrder: { default: null, type: Number },
    isActive: { default: true, type: Boolean },
    campaignOnly: { default: false, type: Boolean },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    scope: { default: "TEAM", enum: TASK_SCOPES, type: String },
    taskType: {
      default: DEFAULT_TASK_TYPE,
      enum: TASK_TYPES,
      required: true,
      type: String,
    },
    scheduleType: {
      default: null,
      enum: TASK_SCHEDULE_TYPES,
      type: String,
    },
    scheduledWeekdays: {
      default: undefined,
      type: [Number],
    },
    scheduledMonthDays: {
      default: undefined,
      type: [Number],
    },
    targetCount: { default: null, min: 1, type: Number },
    targetRoles: {
      default: undefined,
      enum: TASK_TARGET_ROLES,
      type: [String],
    },
    completedAt: { default: null, type: Date },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    submissionMessage: { default: "", trim: true, type: String },
    completionMessage: { default: "", trim: true, type: String },
    title: { required: true, trim: true, type: String },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

taskSchema.index({ isActive: 1, scope: 1, teamId: 1, createdAt: -1 });
taskSchema.index({ isActive: 1, scope: 1, zoneId: 1, createdAt: -1 });
taskSchema.index({ isActive: 1, scope: 1, regionId: 1, createdAt: -1 });
taskSchema.index({ campaignOnly: 1, isActive: 1, teamId: 1, createdAt: -1 });

export type TaskRecord = {
  _id: Types.ObjectId;
  createdBy: Types.ObjectId;
  deadlineTime: string;
  description: string;
  externalLabel?: string;
  externalUrl?: string;
  expReward: number;
  pointReward: number;
  lateWindowDays: number;
  sortOrder: number | null;
  isActive: boolean;
  campaignOnly: boolean;
  regionId: Types.ObjectId | null;
  scope: TaskScope;
  scheduleType?: TaskScheduleType | null;
  scheduledWeekdays?: number[] | null;
  scheduledMonthDays?: number[] | null;
  submissionMessage: string;
  completionMessage: string;
  taskType: TaskType;
  targetCount: number | null;
  targetRoles?: TaskTargetRole[] | null;
  completedAt: Date | null;
  teamId: Types.ObjectId;
  title: string;
  zoneId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskModel = models.Task || model("Task", taskSchema);
