import { model, models, Schema, Types } from "mongoose";

const dttClassTaskSchema = new Schema(
  {
    classId: { ref: "DttClass", required: true, type: Schema.Types.ObjectId, index: true },
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
    isInherited: { default: false, type: Boolean },
  },
  { timestamps: true },
);

dttClassTaskSchema.index({ classId: 1, taskId: 1 }, { unique: true });

export type DttClassTaskRecord = {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  taskId: Types.ObjectId;
  teamId: Types.ObjectId;
  isInherited: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const DttClassTaskModel =
  models.DttClassTask || model("DttClassTask", dttClassTaskSchema);
