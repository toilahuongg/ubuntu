import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const taskTemplateSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    deadlineTime: { required: true, type: String },
    description: { default: "", trim: true, type: String },
    formSchema: { default: [], type: [Schema.Types.Mixed] },
    isActive: { default: true, type: Boolean },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    title: { required: true, trim: true, type: String },
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
