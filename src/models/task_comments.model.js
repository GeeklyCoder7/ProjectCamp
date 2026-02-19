import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { TaskActivity } from "./task_activities.model.js";

const taskCommentSchema = new Schema(
  {
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
      index: true,
    },
    commentedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

taskCommentSchema.index({
  taskId: 1,
  createdAt: -1,
});

// Returns all the comments related to the specified taskId in paginated format
taskCommentSchema.statics.getPaginatedTaskComments = async function ({
  taskId,
  page = 1,
  limit = 10,
  sort = "dsc",
}) {
  const skip = (page - 1) * limit;
  const query = { taskId };

  const [comments, totalComments] = await Promise.all([
    // 1st task: Fetching the comments related to taskId with pagination
    this.find(query)
      .sort({ createdAt: sort === "asc" ? 1 : -1 })
      .skip(skip)
      .limit(limit),

    // 2nd task: Counting total number of tasks realted to the taskId
    this.countDocuments(query),
  ]);

  return {
    comments,
    totalComments,
  };
};

taskCommentSchema.methods.deleteComment = async function ({
  currentUserId,
  task,
}) {
  if (!this.taskId.equals(task._id)) {
    throw new ApiError(409, "Comment does not belong to the specified task");
  }

  const isAuthor = this.commentedBy.equals(currentUserId);

  // Checking if the current user is the author of the comment: only authors can delete the comment
  if (!isAuthor) {
    throw new ApiError(403, "You are not the author of this comment");
  }

  await this.deleteOne();

  // Logging activity
  await TaskActivity.logTaskActivity({
    type: "COMMENT_DELETED",
    taskId: this.taskId,
    projectId: this.projectId,
    performedBy: currentUserId,
  });

  return true;
};

export const TaskComment = mongoose.model("TaskComment", taskCommentSchema);
