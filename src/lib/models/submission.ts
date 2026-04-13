import { InferSchemaType, model, models, Schema, Types } from "mongoose";

const submissionSchema = new Schema(
  {
    actorUserId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    occurrenceId: { ref: "TaskOccurrence", required: true, type: Schema.Types.ObjectId },
    subjectUserId: { ref: "User", required: true, type: Schema.Types.ObjectId },
    submittedAt: { default: () => new Date(), type: Date },
    updatedAt: { default: () => new Date(), type: Date },
    values: { default: {}, type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

submissionSchema.index({ occurrenceId: 1, subjectUserId: 1 }, { unique: true });

export type SubmissionRecordModel = InferSchemaType<typeof submissionSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const SubmissionModel =
  models.Submission || model("Submission", submissionSchema);
