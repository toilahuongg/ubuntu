import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const submissionSchema = new Schema(
  {
    actorUserId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    completionCount: { default: 1, min: 1, type: Number },
    date: { required: true, type: String },
    subjectUserId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    submittedAt: { default: () => new Date(), type: Date },
    taskId: { ref: "Task", required: true, type: Schema.Types.ObjectId },
    updatedAt: { default: () => new Date(), type: Date },
  },
  { timestamps: true },
);

submissionSchema.index(
  { taskId: 1, date: 1, subjectUserId: 1 },
  { unique: true },
);

export type SubmissionRecordModel = InferSchemaType<typeof submissionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SubmissionModel =
  models.Submission || model("Submission", submissionSchema);
