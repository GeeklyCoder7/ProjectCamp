import mongoose, { Schema } from "mongoose";
import { Project } from "../models/project.model.js";
import { getProjectOrThrow } from "../utils/helpers.js";
import { ApiError } from "../utils/api-error.js";

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

// Accepts the invitation by changing it's status. This method also accepts parameters like snapshot, metadata, etc as it needs to futher pass them to the addMember() method
invitationSchema.methods.acceptInvitation = async function ({
  projectId,
  userId,
  performedBy,
  performedBySnapshot,
}) {
  // Fetching the project to check for member existence
  const project = await getProjectOrThrow(projectId);

  if (project.hasMember(userId)) {
    throw new ApiError(409, "You are already a member of this project");
  }

  // Checking if the invitation can be accepted: (must be pending, must belong to the user trying to accept, must not be expired). If "canAcceptInvitation()" does not throw any error, that means we can add this user and update the invitation status
  const result = this.canAcceptInvitation(userId);

  // Adding the member
  await project.addMember({
    userId,
    performedBy,
    performedBySnapshot,
    metadata: {
      source: "INVITATION",
      invitationId: this._id,
    },
  });

  // Saving the project
  await project.save();

  // Updating the status
  this.invitationStatus = "accepted";
  await this.save();
};

// Checks whether the invitation can be accepted
invitationSchema.methods.canAcceptInvitation = function (userId) {
  // Checking if the invitation is pending (must be pending)
  if (this.invitationStatus !== "pending") {
    throw new ApiError(400, "Invitation is not longer active");
  }

  // Checking if the invitation belongs to the current user
  if (this.invitedUser !== userId) {
    throw new ApiError(403, "This invitation doesn't belong to you");
  }

  // Invitation must not be expired
  if (this.expiresAt < new Date()) {
    throw new ApiError(410, "This invitation has expired");
  }

  return true;
};

export const ProjectInvitation = mongoose.model(
  "ProjectInvitation",
  invitationSchema,
);
