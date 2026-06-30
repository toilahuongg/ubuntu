import { model, models, Schema, Types } from "mongoose";

const dttEnrollmentSchema = new Schema(
  {
    userId: { ref: "User", required: true, type: Schema.Types.ObjectId, index: true },
    classId: { ref: "DttClass", required: true, type: Schema.Types.ObjectId, index: true },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
    enrolledBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    enrolledAt: { default: Date.now, type: Date },
  },
  { timestamps: true }
);

dttEnrollmentSchema.index({ userId: 1 }, { unique: true });

export type DttEnrollmentRecord = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  classId: Types.ObjectId;
  teamId: Types.ObjectId;
  enrolledBy: Types.ObjectId;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const DttEnrollmentModel =
  models.DttEnrollment || model("DttEnrollment", dttEnrollmentSchema);
