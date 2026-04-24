import {
  deleteModel,
  InferSchemaType,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

export const POINT_SOURCES = [
  "task_reward",
  "cosmetic_purchase",
  "admin_adjust",
  "customer_interaction_reward",
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

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

function cachedModelHasCurrentSourceEnum() {
  const sourcePath = models.PointTransaction?.schema.path("source") as
    | { enumValues?: string[] }
    | undefined;
  const enumValues = sourcePath?.enumValues ?? [];
  return POINT_SOURCES.every((source) => enumValues.includes(source));
}

if (models.PointTransaction && !cachedModelHasCurrentSourceEnum()) {
  deleteModel("PointTransaction");
}

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
