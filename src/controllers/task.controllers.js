import { Task } from "../models/tasks.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { getProjectOrThrow, getUserOrThrow } from "../utils/helpers.js";
import { Project } from "../models/project.models.js";

// Adds a new task for the project
const addTask = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from project existence middleware
  const currentUser = req.user; // Coming from user existence middleware

  // Handling inputs
  const { title, description } = req.body;

  if (!title) {
    throw new ApiError(400, "Task title is required");
  }

  // Creating a task
  const newTask = await Task.create({
    title,
    description: description,
    createdBy: currentUser._id,
    projectId: project._id,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        newTask,
      },
      "Task created successfully",
    ),
  );
});

// Assigns members to the task
const assignTask = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const task = req.task;

  const { assignMemberId } = req.body;

  if (!assignMemberId) {
    throw new ApiError(400, "User id is required for assigning");
  }

  const project = await getProjectOrThrow(task.projectId);

  // Assigning the member
  await task.assignMember({
    currentUserId: currentUser._id,
    assignMemberId,
    project,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        assignedMemberId: assignMemberId,
      },
      "Member assigned successfully",
    ),
  );
});

// Unassigns the members of the tasks
const unassignMember = asyncHandler(async (req, res) => {
  const task = req.task;
  const currentUser = req.user;

  const { unassignMemberId } = req.body;

  if (!unassignMemberId) {
    throw new ApiError(400, "Member id is required to unassign");
  }

  const project = await getProjectOrThrow(task.projectId);

  await task.unassignMember({
    currentUserId: currentUser._id,
    unassignMemberId,
    project,
  });

  return res
    .status(200)
    .json(new ApiError(200, null, "Member successfully removed from the task"));
});

// Updates the task status
const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = req.task;

  const { newStatus } = req.body;

  if (!newStatus) {
    throw new ApiError(400, "new status is required to update the old status");
  }

  await task.updateStatus({ newStatus, currentMemberId: req.user._id });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        newStatus,
      },
      "Task status updated successfully",
    ),
  );
});

export { addTask, assignTask, unassignMember, updateTaskStatus };
