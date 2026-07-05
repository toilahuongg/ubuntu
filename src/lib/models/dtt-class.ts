import { model, models, Schema, Types } from "mongoose";

const dttClassSchema = new Schema(
  {
    name: { required: true, trim: true, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId, index: true },
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    startDayOfWeek: { required: true, type: Number, default: 1, min: 1, max: 7 },
  },
  { timestamps: true }
);

dttClassSchema.index({ name: 1, teamId: 1 }, { unique: true });

export type DttClassRecord = {
  _id: Types.ObjectId;
  name: string;
  teamId: Types.ObjectId;
  createdBy: Types.ObjectId;
  startDayOfWeek: number;
  createdAt: Date;
  updatedAt: Date;
};

export const DttClassModel =
  models.DttClass || model("DttClass", dttClassSchema);

