import { Task } from "../models/tasks.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { getProjectOrThrow, getUserOrThrow } from "../utils/helpers.js";

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

// Assigns the task
const assignTask = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const task = req.task;

  const { assignMemberId } = req.body;

  if (!assignMemberId) {
    throw new ApiError(400, "User id is required for assigning");
  }

  // Checking if the member we are trying to assing is even present in the DB's User collection
  const memberToAssign = await getUserOrThrow(assignMemberId);

  const project = await getProjectOrThrow(task.projectId);

  // Assigning the member
  await task.assignMember({
    currentUserId: currentUser._id,
    assignMemberId: memberToAssign._id,
    project,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        assignedMemberId: memberToAssign._id,
      },
      "Member assigned successfully",
    ),
  );
});

export { addTask, assignTask };
