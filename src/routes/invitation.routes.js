import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  acceptInvitation,
  rejectInvitation,
  sendInvitation,
} from "../controllers/invitation.controllers.js";
import {
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";
import {
  checkInvitationExistence,
  checkInvitationExpiry,
} from "../middlewares/invitation.middlewares.js";

const invitationRouter = Router();

// Used for sending the project invitation
invitationRouter.post(
  "/:projectId/invite",
  verifyJWT,
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles(["owner"]),
  sendInvitation,
);

// Used for accepting the invitation
invitationRouter.patch(
  "/:invitationId/accept",
  verifyJWT,
  checkInvitationExistence,
  checkInvitationExpiry,
  acceptInvitation,
);

// Used for rejecting the invitation
invitationRouter.patch(
  "/:invitationId/reject",
  verifyJWT,
  checkInvitationExistence,
  checkInvitationExpiry,
  rejectInvitation,
);

export default invitationRouter;
