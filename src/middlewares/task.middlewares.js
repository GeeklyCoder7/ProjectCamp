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

export {
    checkTaskExistence
}