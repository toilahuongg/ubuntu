import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const POINT_SOURCES = ["task_completion"] as const;

const pointTransactionSchema = new Schema(
  {
    amount: { required: true, type: Number },
    description: { default: "", type: String },
    source: { enum: POINT_SOURCES, required: true, type: String },
    sourceId: { default: null, type: Schema.Types.ObjectId },
    userId: { index: true, ref: "User", required: true, type: Schema.Types.ObjectId },
  },
  { timestamps: true },
);

pointTransactionSchema.index({ userId: 1, createdAt: -1 });

export type PointTransactionRecord = InferSchemaType<
  typeof pointTransactionSchema
> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const PointTransactionModel =
  models.PointTransaction ||
  model("PointTransaction", pointTransactionSchema);
