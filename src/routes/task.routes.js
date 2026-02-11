import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  checkProjectExistence,
  ensureIsActive,
  requireProjectRoles,
} from "../middlewares/projectAccess.middleware.js";
import {
  addComment,
  addTask,
  assignTask,
  deleteComment,
  getTaskComments,
  unassignMember,
  updateTaskStatus,
} from "../controllers/task.controllers.js";
import {
  canTask,
  checkTaskExistence,
} from "../middlewares/task.middlewares.js";

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
  canTask("assign_members"),
  assignTask,
);

// Used removing the assigned members
taskRouter.patch(
  "/unassignMember/:taskId",
  verifyJWT,
  checkTaskExistence,
  canTask("unassign_members"),
  unassignMember,
);

// Used for updating the task status
taskRouter.patch(
  "/:taskId/status",
  verifyJWT,
  checkTaskExistence,
  canTask("update_status"),
  updateTaskStatus,
);

// Used for adding a comment
taskRouter.post(
  "/:taskId/comments",
  verifyJWT,
  checkTaskExistence,
  canTask("add_comment"),
  addComment,
);

// Used for fetching comments with pagination
taskRouter.get(
  "/:taskId/comments",
  verifyJWT,
  checkTaskExistence,
  canTask("view_comments"),
  getTaskComments,
);

// Used for deleting a comment
taskRouter.delete(
  "/:taskId/comments/:commentId",
  verifyJWT,
  checkTaskExistence,
  deleteComment,
);

export default taskRouter;
