import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/api-error.js";

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
    taskComments: {
      type: [taskCommentSchema],
      default: [],
    }
  },
  {
    timestamps: true,
  },
);

const taskCommentSchema = new Schema(
  {
    commentedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentions: [
      {
        type: mongoose.Types.ObjectId,
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
};

// Checks if the member can be assigned to the task
taskSchema.methods.canAssignMember = function ({
  currentUserId,
  assignMemberId,
  project,
}) {
  // Checking if the member we are trying to assign is even the member of the project? Only existing members can be assigned to a task
  if (!project.hasMember(assignMemberId)) {
    throw new ApiError(
      422,
      "The user you are trying to assign is not the member of this project",
    );
  }

  // Checking if the current user is the owner of the project: Only owners or admins can assign member to a task
  if (!project.isOwner(currentUserId)) {
    throw new ApiError(
      403,
      "Only owners or admins can assign members to the task",
    );
  }

  // Checking if the member we are trying to assign is already assigned to task in the current project
  if (this.assignedTo.includes(assignMemberId)) {
    throw new ApiError(409, "The member is already assigned to this task");
  }

  // Checking if the task status is completed: Members cannot be assigned to completed tasks
  if (this.taskStatus === "completed") {
    throw new ApiError(403, "Task is completed, cannot assign more members");
  }

  return true;
};

// Unassigns (removes) the member from the task
taskSchema.methods.unassignMember = async function ({
  currentUserId,
  unassignMemberId,
  project,
}) {
  this.canUnassignMember({ currentUserId, unassignMemberId, project });

  // Unassigning / removing the member
  this.assignedTo = this.assignedTo.filter(
    (memberId) => !memberId.equals(unassignMemberId),
  );

  await this.save();
};

// Checks if the member can be unassigned or removed from the task
taskSchema.methods.canUnassignMember = function ({
  currentUserId,
  unassignMemberId,
  project,
}) {
  if (!project.isOwner(currentUserId)) {
    throw new ApiError(
      403,
      "You are not authorized to remove a member from the task. Only owners can perform this action",
    );
  }

  // The member we are trying to remove must be the part of the task at the first place
  if (!this.assignedTo.includes(unassignMemberId)) {
    throw new ApiError(
      404,
      "The member you are trying to remove is not assigned to this task",
    );
  }

  return true;
};

// Updates the task status
taskSchema.methods.updateStatus = async function ({
  newStatus,
  currentMemberId,
}) {
  // Denotes what are the allowed transitions from the current transition
  const allowedStatusTransitions = {
    todo: ["in_progress", "completed"],
    in_progress: ["completed"],
    completed: [],
  };
  console.log(`User id being passed: ${currentMemberId}`);

  // Checking if the member performing this action even assigned to the current task
  if (!this.assignedTo.includes(currentMemberId)) {
    throw new ApiError(403, "You are not assigned to this task");
  }

  // Checking if the transition is allowed from the current status to the new status
  if (!allowedStatusTransitions[this.taskStatus].includes(newStatus)) {
    throw new ApiError(
      403,
      `You are not allowed to transition to '${newStatus}'`,
    );
  }

  // Updating the status
  this.taskStatus = newStatus;
  await this.save();
};
export const Task = mongoose.model("Task", taskSchema);
