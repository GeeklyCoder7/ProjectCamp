import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";
import { addTask, assignTask } from "../controllers/task.controllers.js";
import { checkTaskExistence } from "../middlewares/task.middlewares.js";

const taskRouter = Router();

// Used for adding a new task
taskRouter.post(
  "/addTask/:projectId",
  verifyJWT,
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles(["owner", "admin"]),
  addTask,
);

// Used for assigning members to the existing tasks
taskRouter.patch(
  "/:projectId/:taskId/assignMembers",
  verifyJWT,
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles(["owner", "admin"]),
  checkTaskExistence,
  assignTask,
);

export default taskRouter;
