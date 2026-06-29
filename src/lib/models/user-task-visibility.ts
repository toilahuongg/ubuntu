import { model, models, Schema, Types } from "mongoose";

const userTaskVisibilitySchema = new Schema(
  {
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    isVisible: { required: true, type: Boolean },
    updatedBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

userTaskVisibilitySchema.index({ userId: 1, taskId: 1 }, { unique: true });

export const UserTaskVisibilityModel =
  models.UserTaskVisibility || model("UserTaskVisibility", userTaskVisibilitySchema);
