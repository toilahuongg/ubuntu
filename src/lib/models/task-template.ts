import { InferSchemaType, model, models, Schema, Types } from "mongoose";

import { TEMPLATE_SCOPES } from "@/lib/domain";

const taskTemplateSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    expReward: { default: 10, min: 0, type: Number },
    formSchema: { default: [], type: [Schema.Types.Mixed] },
    isActive: { default: true, type: Boolean },
    regionId: { default: null, ref: "Region", type: Schema.Types.ObjectId },
    scope: { default: "TEAM", enum: TEMPLATE_SCOPES, type: String },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    title: { required: true, trim: true, type: String },
    zoneId: { default: null, ref: "Zone", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

export type TaskTemplateRecord = InferSchemaType<typeof taskTemplateSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TaskTemplateModel =
  models.TaskTemplate || model("TaskTemplate", taskTemplateSchema);
