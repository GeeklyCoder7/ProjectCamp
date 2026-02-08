import mongoose, { Schema } from "mongoose";
import { Project } from "./project.models.js";
import { getProjectOrThrow } from "../utils/helpers.js";
import { ApiError } from "../utils/api-error.js";

/**
 * @typedef {import("mongoose").Document & {
 *   invitedUser: import("mongoose").Types.ObjectId
 * }} InvitationDocument
 */
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

  // Checking if the invitation can be accepted: (must be pending, must belong to the user trying to accept, must not be expired). If "canAcceptInvitation()" does not throw any error, that means we can add this user and update the invitation status

  await this.canAcceptInvitation({ userId, project });

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

const ACTIVE_INVITATION_STATUSES = ["pending", "expired"];

// Checks whether the invitation can be accepted
invitationSchema.methods.canAcceptInvitation = async function ({
  userId,
  project,
}) {
  if (project.hasMember(userId)) {
    throw new ApiError(409, "You are already a member of this project");
  }

  // Checking if the invitation is pending (must be pending)
  if (this.invitationStatus !== "pending") {
    throw new ApiError(400, "Invitation is not longer active");
  }

  // Checking if the invitation belongs to the current user
  if (!this.invitedUser.equals(userId)) {
    throw new ApiError(403, "This invitation doesn't belong to you");
  }

  // Invitation must not be expired
  if (this.expiresAt < new Date()) {
    throw new ApiError(410, "This invitation has expired");
  }

  return true;
};

// Rejects the invitation along with updating the status
invitationSchema.methods.rejectInvitation = async function (userId) {
  // Checking if the user can perform rejection
  this.canRejectInvitation(userId);

  // Updating the status
  this.invitationStatus = "rejected";
  await this.save();
};

/**
 * @this {InvitationDocument}
 */

// Checks if the invitation can be rejected
invitationSchema.methods.canRejectInvitation = function (userId) {
  // Checking if the invitation even belongs to the user
  if (!this.invitedUser.equals(userId)) {
    throw new ApiError(403, "This invitation does not belong to you.");
  }

  // Checking if invitation status is not pending: Only pending invitations can be rejected
  if (this.invitationStatus !== "pending") {
    throw new ApiError(400, "Invitation is not active");
  }

  // Checking if the invitation has expired
  if (this.expiresAt < new Date()) {
    throw new ApiError(410, "The invitation has already expired.");
  }
  return true;
};

// Updates the status of the invitation by checking can it even be updated to the desired state.
invitationSchema.methods.updateStatus = function (newStatus) {
  // Allowed transitions
  const allowedStatusTransitions = {
    pending: ["accepted", "rejected", "expired"],
  };

  const currentStatus = this.invitationStatus;

  if (!allowedStatusTransitions[currentStatus]) {
    throw new ApiError(400, "Invitation status can no longer be changed");
  }

  if (!allowedStatusTransitions[currentStatus].includes(newStatus)) {
    throw new ApiError(400, "Cannot transition to this status");
  }

  // Changing the status
  this.invitationStatus = newStatus;
};

// Returns all the pending and expired invitations for the current user
invitationSchema.statics.getInvitationsRaw = async function (userId) {
  // Checking if the user id is provided or not
  if (!userId) {
    throw new ApiError(400, "User Id is required for fetching invitations");
  }

  // Fetching the invitations
  const invitations = await this.find({
    invitedUser: userId,
    invitationStatus: { $in: ACTIVE_INVITATION_STATUSES },
  });

  return invitations;
};

// Fetches the invitations from the getInvitationsRaw() method and returns it by implementing pagination
invitationSchema.statics.getInvitationsPaginated = async function ({
  userId,
  page = 1,
  limit = 5,
}) {
  const rawInvitations = await this.getInvitationsRaw(userId);

  const start = (page - 1) * limit;

  const paginatedInvitations = rawInvitations.slice(start, start + limit);

  return {
    totalLength: rawInvitations.length,
    page,
    limit,
    invitations: paginatedInvitations,
  };
};


export const ProjectInvitation = mongoose.model(
  "ProjectInvitation",
  invitationSchema,
);
