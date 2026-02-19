import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/api-error.js";
import {
  getProjectOrThrow,
} from "../utils/helpers.js";
import { TaskComment } from "./task_comments.model.js";
import { TaskActivity } from "./task_activities.model.js";

const taskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    assignedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    completionDeadline: {
      type: Date,
      default: () => {
        // This method is run when no specific date is passed to this schema, it automatically sets deadline to 7 days after current date
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },
    taskStatus: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/** UTILITY METHODS */

// Returns true if the task is active i.e. not completed yet
taskSchema.methods.isActive = function () {
  return this.taskStatus === "todo" || this.taskStatus === "in_progress";
};

// A generic method that serves as a single source of truth for granting access to different actions in the task document
taskSchema.methods.can = async function (action, currentUserId) {
  const project = await getProjectOrThrow(this.projectId);

  const isAssignee = this.assignedTo.includes(currentUserId);
  const isOwner = project.isOwner(currentUserId);

  switch (action) {
    case "view_comments":
      return isAssignee || isOwner;

    case "add_comment":
      if (!this.isActive()) {
        throw new ApiError(409, "Task is not active");
      }
      return isAssignee;

    case "view_comments":
      return isAssignee || isOwner;

    case "update_status":
      return isAssignee;

    case "assign_members":
      if (!this.isActive()) {
        throw new ApiError(409, "Task is not active");
      }
      return isOwner;
    case "unassign_members":
      return isOwner;

    default:
      throw new ApiError(400, `Unknown task permission: ${action}`);
  }
};

// This method assigns a new member to the task
taskSchema.methods.assignMember = async function ({
  currentUserId,
  assignMemberId,
  project,
}) {
  // Checking if member can be assigned (as per the business rules)
  this.canAssignMember({ currentUserId, assignMemberId, project });

  // Assigning the member
  this.assignedTo.push(assignMemberId);
  await this.save();

  // Logging the activity
  await TaskActivity.logTaskActivity({
    type: "TASK_ASSIGNED",
    taskId: this._id,
    projectId: this.projectId,
    performedBy: currentUserId,
    metadata: {
      newMemberId: assignMemberId,
    },
  });
};

// Checks if the member can be assigned to the task
taskSchema.methods.canAssignMember = function ({ assignMemberId }) {
  // Checking if the member we are trying to assign is already assigned to task in the current project
  if (this.assignedTo.includes(assignMemberId)) {
    throw new ApiError(409, "The member is already assigned to this task");
  }

  return true;
};

// Unassigns (removes) the member from the task
taskSchema.methods.unassignMember = async function ({
  currentUserId,
  unassignMemberId,
}) {
  this.canUnassignMember(unassignMemberId);

  // Unassigning / removing the member
  this.assignedTo = this.assignedTo.filter(
    (memberId) => !memberId.equals(unassignMemberId),
  );

  await this.save();

  // Logging activity
  await TaskActivity.logTaskActivity({
    type: "TASK_UNASSIGNED",
    taskId: this._id,
    projectId: this.projectId,
    performedBy: currentUserId,
    metadata: {
      removedMemberId: unassignMemberId,
    },
  });
};

// Checks if the member can be assigned
taskSchema.methods.canUnassignMember = function (unassignMemberId) {
  if (!this.assignedTo.includes(unassignMemberId)) {
    throw new ApiError(400, "Member is not even assigned");
  }
};

// Updates the task status
taskSchema.methods.updateStatus = async function (currentUserId, newStatus) {
  // Denotes what are the allowed transitions from the current transition
  const allowedStatusTransitions = {
    todo: ["in_progress", "completed"],
    in_progress: ["completed"],
    completed: [],
  };

  // Checking if the transition is allowed from the current status to the new status
  if (!allowedStatusTransitions[this.taskStatus].includes(newStatus)) {
    throw new ApiError(
      403,
      `You are not allowed to transition to '${newStatus}'`,
    );
  }

  // Storing the old status for activity logging
  const oldStatus = this.taskStatus;

  // Updating the status
  this.taskStatus = newStatus;
  await this.save();

  // Logging the activity
  await TaskActivity.logTaskActivity({
    type: "TASK_STATUS_UPDATED",
    taskId: this._id,
    projectId: this.projectId,
    performedBy: currentUserId,
    metadata: {
      oldStatus,
      newStatus,
    },
  });
};

// Adds a comment to the task
taskSchema.methods.addComment = async function ({
  commentedById,
  content,
  mentions,
}) {
  await this.can("add_comment", commentedById);

  TaskComment.create({
    taskId: this._id,
    projectId: this.projectId,
    commentedBy: commentedById,
    mentions: mentions ?? [],
    content,
  });

  // Logging activity
  await TaskActivity.logTaskActivity({
    type: "COMMENT_ADDED",
    taskId: this._id,
    projectId: this.projectId,
    performedBy: commentedById,
  });
};

// Returns the task comments in paginated format
taskSchema.methods.getComments = async function ({
  page = 1,
  limit = 10,
  sort = "dsc",
  currentUserId,
}) {
  await this.can("view_comments", currentUserId);

  const { comments, totalComments } =
    await TaskComment.getPaginatedTaskComments({
      taskId: this._id,
      page,
      limit,
      sort,
    });

  return {
    totalComments,
    comments,
  };
};

export const Task = mongoose.model("Task", taskSchema);
