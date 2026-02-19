import mongoose, { Schema } from "mongoose";
import { getUserOrThrow } from "../utils/helpers.js";

const taskActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "TASK_CREATED",
        "TASK_ASSIGNED",
        "TASK_UNASSIGNED",
        "TASK_STATUS_UPDATED",
        "COMMENT_ADDED",
        "COMMENT_DELETED",
      ],
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedBySnapshot: {
      _id: { type: Schema.Types.ObjectId },
      userName: { type: String },
      email: { type: String },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

// Creates and stores a new task acitivty object
taskActivitySchema.statics.logTaskActivity = async function ({
  type,
  taskId,
  projectId,
  performedBy,
  metadata = {},
}) {
  const performedByUser = await getUserOrThrow(performedBy);
  const performedBySnapshot = {
    _id: performedByUser._id,
    userName: performedByUser.userName,
    email: performedByUser.email,
  };
  return this.create({
    type,
    taskId,
    projectId,
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

export const TaskActivity = mongoose.model("TaskActivity", taskActivitySchema);
