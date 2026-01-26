import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addProjectMember,
  createProject,
  getAllProjects,
  getProjectActivities,
  getProjectById,
  getProjectMembers,
  leaveProject,
  removeMember,
  transferOwnership,
  updateProjectState,
} from "../controllers/project.controller.js";
import {
  checkMembership,
  checkProjectExistence,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";

const projectRouter = Router();

projectRouter.post("/create", verifyJWT, createProject); // Used for creating a new project

projectRouter.patch(
  "/addMember/:currentProjectId",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner"]),
  addProjectMember,
); // Used for adding new member to the project

projectRouter.patch(
  "/removeMember/:currentProjectId",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner"]),
  removeMember,
); // Used for removing a member from the project

projectRouter.patch(
  "/updateStatus/:currentProjectId",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner"]),
  updateProjectState,
); // Used for updating the status of the project

projectRouter.get("/my", verifyJWT, getAllProjects); // Used for getting all the project for the current user

projectRouter.get(
  "/:projectId",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner", "member"]),
  getProjectById,
); // Used for fetching the project by id

projectRouter.get(
  "/:projectId/getMembers",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner", "member"]),
  getProjectMembers,
); // Used for fetching members of the project

projectRouter.patch(
  "/:projectId/transferOwnership",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner"]),
  transferOwnership,
); // Used to transfer the ownership

projectRouter.patch(
  "/:projectId/leaveProject",
  verifyJWT,
  checkProjectExistence,
  checkMembership,
  leaveProject,
); // Used by the member for leaving the project

projectRouter.get(
  "/:projectId/activities",
  verifyJWT,
  checkProjectExistence,
  requireProjectRoles(["owner"]),
  getProjectActivities,
); // Used for fetching the project activities

export default projectRouter;
