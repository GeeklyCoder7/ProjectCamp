import { Task } from "../models/tasks.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { getProjectOrThrow } from "../utils/helpers.js";
import { TaskComment } from "../models/task_comments.model.js";

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

  const { unassignMemberId } = req.body;

  if (!unassignMemberId) {
    throw new ApiError(400, "Member id is required to unassign");
  }

  await task.unassignMember({
    unassignMemberId,
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

  await task.updateStatus(newStatus);

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

// Adds a new comment to the task
const addComment = asyncHandler(async (req, res) => {
  const task = req.task;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  await task.addComment({ commentedById: req.user._id, content });

  return res
    .status(201)
    .json(new ApiResponse(201, null, "Comment posted successfully"));
});

// Returns all the comments in the task with pagination
const getTaskComments = asyncHandler(async (req, res) => {
  const task = req.task;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 5, 1);
  const sort = req.query.sort ?? "asc";

  const { comments, totalComments } = await task.getComments({
    page,
    limit,
    sort,
    currentUserId: req.user._id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalComments,
        totalPages: Math.ceil(totalComments / limit),
        page,
        comments,
      },
      "Comments fetched successfully",
    ),
  );
});

// Deletes the specified comment
const deleteComment = asyncHandler(async (req, res) => {
  const task = req.task;

  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment ID is required");
  }

  const commentToDelete = await TaskComment.findById(commentId);

  if (!commentToDelete) {
    throw new ApiError(404, "Comment not found");
  }

  await commentToDelete.deleteComment({ currentUserId: req.user._id, task });

  return res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Comment deleted successfully"
    )
  );
});

export {
  addTask,
  assignTask,
  unassignMember,
  updateTaskStatus,
  addComment,
  getTaskComments,
  deleteComment,
};
