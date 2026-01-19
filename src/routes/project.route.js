import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addProjectMember,
  createProject,
  removeMember,
  updateProjectState,
} from "../controllers/project.controller.js";

const projectRouter = Router();

projectRouter.post("/create", verifyJWT, createProject); // Used for creating a new project

projectRouter.patch(
  "/addMember/:currentProjectId",
  verifyJWT,
  addProjectMember,
); // Used for adding new member to the project

projectRouter.patch("/removeMember/:currentProjectId", verifyJWT, removeMember); // Used for removing a member from the project

projectRouter.patch(
  "/updateStatus/:currentProjectId",
  verifyJWT,
  updateProjectState,
); // Used for updating the status of the project

export default projectRouter;
