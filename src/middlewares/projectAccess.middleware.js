import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

// Checks if the project exists and attaches it to req.project
const checkProjectExistence = asyncHandler(async (req, res, next) => {
  const { projectId, currentProjectId } = req.params;
  const id = projectId || currentProjectId;

  if (!id) {
    throw new ApiError(400, "Project ID is required");
  }

  const project = await Project.findById(id);

  if (!project) {
    throw new ApiError(404, "Project does not exist");
  }

  // Attaching project to the req
  req.project = project;

  next();
});

// Checks if current user is member of the project
const checkMembership = asyncHandler(async (req, res, next) => {
  const project = req.project; // Coming from projectExistence middleware

  if (!project) {
    throw new ApiError(500, "Project not loaded in request");
  }

  const userId = req.user._id.toString();

  if (!project.hasMember(userId)) {
    throw new ApiError(403, "You are not a member of this project");
  }

  next();
});

// Checks if the current user is the owner of the project
const checkOwnership = asyncHandler(async (req, res, next) => {
  const project = req.project; // Coming from projectExistence middleware

  if (!project) {
    throw new ApiError(500, "Project not loaded in the request");
  }

  const userId = req.user._id.toString();

  if (!project.isOwner(userId)) {
    throw new ApiError(
      403,
      "You are not the owner of this project thus cannot perform this action",
    );
  }

  next();
});

export { checkMembership, checkProjectExistence, checkOwnership };
