import { model, models, Schema, Types } from "mongoose";

const monthlyGoalSchema = new Schema(
  {
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    yearMonth: { required: true, type: String },
    targetCount: { min: 1, required: true, type: Number },
  },
  { timestamps: true },
);

monthlyGoalSchema.index(
  { taskId: 1, userId: 1, yearMonth: 1 },
  { unique: true },
);

export type MonthlyGoalRecord = {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  yearMonth: string;
  targetCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export const MonthlyGoalModel =
  models.MonthlyGoal || model("MonthlyGoal", monthlyGoalSchema);
