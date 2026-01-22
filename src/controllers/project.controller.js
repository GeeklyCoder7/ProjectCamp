import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.models.js";

// Controller for creating a new project
const createProject = asyncHandler(async (req, res) => {
  const { projectName, description } = req.body;

  if (!projectName) {
    return new ApiError(400, "Project name is requried");
  }

  const newProject = await Project.create({
    projectName: projectName,
    status: "active",
    description: description,
    projectOwner: req.user._id,
    members: [{ user: req.user._id, role: "owner" }],
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        name: newProject.projectName,
        id: newProject._id,
      },
      "Project created successfully",
    ),
  );
});

// Controller for adding a new member to the existing project
const addProjectMember = asyncHandler(async (req, res) => {
  const { memberId } = req.body;
  const { project } = req.project;

  if (!memberId) {
    throw new ApiError(400, "New member's ID required");
  }

  // Checking if the DB even contains any user with the received id
  const isInDb = await User.findById(memberId);

  if (!isInDb) {
    throw new ApiError(404, "User you are trying to add does not exist");
  }

  // Checking if the member already exist
  if (project.hasMember(memberId)) {
    throw new ApiError(409, "Member already part of the project");
  }

  // Finally adding a new member
  project.members.push({
    user: memberId,
    role: "member",
  });

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member added successfully"));
});

// Controller for removing member from the project
const removeMember = asyncHandler(async (req, res) => {
  const { currentProjectId } = req.params;
  const { removeMemberId } = req.body;
  const project = req.project;

  // Validating inputs
  if (!currentProjectId) {
    throw new ApiError(400, "Project id required");
  }

  if (!removeMemberId) {
    throw new ApiError(400, "Member id required");
  }

  // Preventing the owner from removing itself
  if (project.isOwner(removeMemberId)) {
    throw new ApiError(400, "Project owner cannot remove himself.");
  }

  // Removing the member
  project.removeMember(removeMemberId);

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member removed successfully"));
});

// Controller for updating project state
const updateProjectState = asyncHandler(async (req, res) => {
  const { currentProjectId } = req.params;
  const { newState } = req.body;
  const project = req.project;

  // Validating inputs
  if (!currentProjectId) {
    throw new ApiError(400, "Project id is required");
  }

  if (!newState) {
    throw new ApiError(400, "New state is required");
  }

  // Checkig if project can be transitioned to the specified state
  if (!project.canTransitionTo(newState)) {
    throw new ApiError(409, "Project cannot be transitioned to this state");
  }

  // Updating the state of the project
  project.status = newState;
  project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project status updated successfully"));
});

// Controller for getting the project by id
const getProjectById = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from req.project

  return res
    .status(200)
    .json(
      new ApiResponse(200, { project: project }),
      "Project fetched successfully",
    );
});

// Controller for getting all the projects for the current user
const getAllProjects = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const projects = await Project.find({
    "members.user": userId,
  })
    .select(
      "projectName status description projectOwner members createdAt updatedAt",
    )
    .skip(skip)
    .limit(limit)
    .sort({
      updatedAt: -1,
    });

  const totalProjects = await Project.countDocuments({
    "members.user": userId,
  });

  return res.status(200).json(
    new ApiResponse(200, {
      projectCount: totalProjects,
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
      limit,
      projects,
    }),
  );
});

// Controller for getting all the members of the project
const getProjectMembers = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistence middleware

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        members: project.members,
      },
      "Members fetched successfully",
    ),
  );
});

export {
  createProject,
  addProjectMember,
  removeMember,
  updateProjectState,
  getProjectById,
  getAllProjects,
  getProjectMembers,
};
