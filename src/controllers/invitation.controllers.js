import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import {
  getInvitationOrThrow,
  getUserByEmailOrThrow,
} from "../utils/helpers.js";
import { ProjectInvitation } from "../models/invitation.model.js";
import { ProjectInvitationExpiryLimit } from "../utils/constants.js";

// Controller for sending invitation to the user
const sendInvitation = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistenceMiddleware
  const { email } = req.body; // Email of the user to whom this invite will be sent

  // Validating inputs
  if (!email) {
    throw new ApiError(400, "Email required for inviting the member");
  }

  // Fetching the user by email
  const invitedUser = await getUserByEmailOrThrow(email);

  // Checking if the invited user is already a member of the current project
  if (project.hasMember(invitedUser._id)) {
    throw new ApiError(409, "User is already a member of the project");
  }

  // Checking if the user can be invited
  const canInvite = await ProjectInvitation.canInviteUser({
    projectId: project._id,
    userId: invitedUser._id,
  });

  if (!canInvite) {
    throw new ApiError(400, "Cannot invite this user");
  }

  // Calculating the expiry date
  const expiresAt = new Date(); // First take the current date
  expiresAt.setDate(expiresAt.getDate() + ProjectInvitationExpiryLimit); // Adding the expiry limit to the current date

  // Creating invitation
  const newInvitation = await ProjectInvitation.create({
    projectId: project._id,
    invitedUser: invitedUser._id,
    invitedBy: req.user._id,
    role: "member",
    invitationStatus: "pending",
    expiresAt,
  });

  // Sending the response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        invitationId: newInvitation._id,
        invitedUser: invitedUser._id,
        expiresAt: expiresAt,
      },
      "Invitation sent successfully.",
    ),
  );
});

// Controller for accepting the invitation
const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = req.invitation; // Coming from invitationExistence middleware

  // Preparing snapshot for activity logging
  const performedBy = req.user._id;

  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };

  // Accepting the invitation
  await invitation.acceptInvitation({
    projectId: invitation.projectId,
    userId: req.user._id,
    performedBy,
    performedBySnapshot,
  });

  // Sending the response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projectId: invitation.projectId,
      },
      "Invitation accepted, you have joined the project successfully.",
    ),
  );
});

// Controller for rejecting the invitation
const rejectInvitation = asyncHandler(async (req, res) => {
  const invitation = req.invitation; // Coming from invitation existence check middleware

  // Rejecting the invitation
  await invitation.rejectInvitation(req.user._id); // Passing the id of the current user who is performing this operation

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Invitation rejected successfully"));
});

export { sendInvitation, acceptInvitation, rejectInvitation };
