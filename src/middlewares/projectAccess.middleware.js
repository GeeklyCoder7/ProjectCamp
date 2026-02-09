import { Project } from "../models/project.models.js";
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

// Generic role-based authorization middlewares
const requireProjectRoles = (allowedRoles = []) =>
  asyncHandler(async (req, res, next) => {
    const project = req.project; // Coming from projectExistence middleware

    if (!project) {
      throw new ApiError(500, "Project not loaded in the request");
    }

    const userId = req.user._id;

    // Checking membership
    const member = project.members.find(
      (member) => member.user.toString() === userId.toString(),
    );

    if (!member) {
      throw new ApiError(403, "You are not member of this project");
    }

    if (!allowedRoles.includes(member.role)) {
      throw new ApiError(
        403,
        "You do not have permission to perform this action",
      );
    }

    next();
  });

// Checks if the project status
const ensureIsActive = asyncHandler(async (req, res, next) => {
  const project = req.project; // Coming from existenceMiddleware since it will always be called before this middleware

  if (!project.isActive()) {
    throw new ApiError(403, "Project is not active");
  }

  next();
});

export {
  checkMembership,
  checkProjectExistence,
  checkOwnership,
  requireProjectRoles,
  ensureIsActive,
};
