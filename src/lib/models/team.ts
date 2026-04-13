import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const teamSchema = new Schema(
  {
    code: { required: true, trim: true, type: String, unique: true },
    leadUserIds: [{ ref: "User", type: Schema.Types.ObjectId }],
    name: { required: true, trim: true, type: String },
  },
  { timestamps: true },
);

export type TeamRecord = InferSchemaType<typeof teamSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const TeamModel = models.Team || model("Team", teamSchema);
