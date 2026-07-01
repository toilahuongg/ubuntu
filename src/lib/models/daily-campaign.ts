import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const dailyCampaignSchema = new Schema(
  {
    createdBy: { ref: "User", required: true, type: Schema.Types.ObjectId },
    date: { required: true, type: String },
    taskIds: {
      default: [],
      ref: "Task",
      required: true,
      type: [Schema.Types.ObjectId],
    },
    teamId: { ref: "Team", required: true, type: Schema.Types.ObjectId },
    updatedBy: { default: null, ref: "User", type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

dailyCampaignSchema.index({ teamId: 1, date: 1 }, { unique: true });
dailyCampaignSchema.index({ date: 1, teamId: 1 });

export type DailyCampaignRecord =
  InferSchemaType<typeof dailyCampaignSchema> & {
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  };

export const DailyCampaignModel =
  models.DailyCampaign || model("DailyCampaign", dailyCampaignSchema);
