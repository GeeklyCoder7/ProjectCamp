import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";
import {
  addTask,
  assignTask,
  unassignMember,
  updateTaskStatus,
} from "../controllers/task.controllers.js";
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
  "/assignMembers/:taskId",
  verifyJWT,
  checkTaskExistence,
  assignTask,
);

// Used removing the assigned members
taskRouter.patch(
  "/unassignMember/:taskId",
  verifyJWT,
  checkTaskExistence,
  unassignMember,
);

// Used for updating the task status
taskRouter.patch(
  "/:taskId/status",
  verifyJWT,
  checkTaskExistence,
  updateTaskStatus,
)

export default taskRouter;
