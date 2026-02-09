import { Task } from "../models/tasks.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// Checks if the task exists and attaches it to the request object and vice versa
const checkTaskExistence = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(404, "Task does not exist");
  }

  req.task = task;

  next();
});

// Single middleware that grants access to task operations based on the action received
const canTask = (action) =>
  asyncHandler(async (req, res, next) => {
    const task = req.task;
    const currentUserId = req.user._id;

    const allowed = await task.can(action, currentUserId);

    if (!allowed) {
      throw new ApiError(403, "You are not allowed to perform this action");
    }

    next();
  });

export { checkTaskExistence, canTask };
