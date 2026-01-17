import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addProjectMember,
  createProject,
} from "../controllers/project.controller.js";

const projectRouter = Router();

projectRouter.post("/create", verifyJWT, createProject); // Used for creating a new project
projectRouter.patch("/addMember/:currentProjectId", verifyJWT, addProjectMember); // Used for adding new member to the project

export default projectRouter;
