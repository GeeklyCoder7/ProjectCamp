import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  acceptInvitation,
  sendInvitation,
} from "../controllers/project.controller.js";
import {
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";

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
  acceptInvitation,
);

export default invitationRouter;
