import mongoose, { Schema } from "mongoose";
import { Project } from "../models/project.model.js";

const invitationSchema = new Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    invitedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "owner"],
      default: "member",
    },
    invitationStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
Prepares index in this sorting order: project –> invitedUser –> invitationStatus
&
Prevents multiple invites for active (pending) invites
*/
invitationSchema.index(
  { projectId: 1, invitedUser: 1, invitationStatus: 1 },
  { unique: true, partialFilterExpression: { invitationStatus: "pending" } },
);

// Checks if the user can be inivited
invitationSchema.statics.canInviteUser = async function ({
  projectId,
  userId,
}) {
  // Checking if any existing invite is present
  const existingInvite = await this.findOne({
    projectId,
    invitedUser: userId,
    invitationStatus: "pending",
  });

  if (existingInvite) {
    return false;
  }

  // Fetching the project for member existence check
  const project = await Project.findById(projectId);
  if (project.hasMember(userId)) {
    return false;
  }

  return true;
};
export const ProjectInvitation = mongoose.model(
  "ProjectInvitation",
  invitationSchema,
);
