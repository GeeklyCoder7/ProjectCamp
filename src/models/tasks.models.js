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
  },
  {
    timestamps: true,
  },
);

// This method assigns a new member to the task
taskSchema.methods.assignMember = async function ({
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

  // Assigning the member
  this.assignedTo.push(assignMemberId);
  await this.save();
};

export const Task = mongoose.model("Task", taskSchema);
