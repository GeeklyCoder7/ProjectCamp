import { ProjectInvitation } from "../models/invitation.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// Used to validate the invitationId and it's existence in the DB and attaches the invitation to the req object
const checkInvitationExistence = asyncHandler(async (req, res, next) => {
  const { invitationId } = req.params;

  if (!invitationId) {
    throw new ApiError(400, "Invitation ID is required");
  }

  // Fetching the invitation
  const invitation = await ProjectInvitation.findById(invitationId);

  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  // Attatching the invitation to the request object
  req.invitation = invitation;

  next();
});

// Checks the invitation expiry and marks it as "expired" if it is expired
const checkInvitationExpiry = asyncHandler(async (req, res, next) => {
  const invitation = req.invitation; // Coming from invitationExistence middleware

  if (!invitation) {
    throw new ApiError(404, "Invitation object is not attached to the req");
  }

  // Checking the expiry: If the current date has moved beyond the expiry that means it's expired
  if (
    invitation.expiresAt < new Date() &&
    invitation.invitationStatus === "pending"
  ) {
    // Updating the invitationStatus
    invitation.updateStatus("expired");
    await invitation.save();
    throw new ApiError(410, "Invitation is expired");
  }

  next();
});

export { checkInvitationExistence, checkInvitationExpiry };
