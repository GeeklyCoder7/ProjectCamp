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
    members: {
      user: req.user._id,
      role: "owner",
    },
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
  const { currentProjectId } = req.params; // will be passed in the url
  const { memberId } = req.body;

  // Validating inputs
  if (!currentProjectId) {
    throw new ApiError(400, "Project ID required for adding members");
  }

  if (!memberId) {
    throw new ApiError(400, "New member's ID required");
  }

  // Checking if the project even exist
  const existingProject = await Project.findById(currentProjectId);

  if (!existingProject) {
    throw new ApiError(404, "Project with the specified ID does not exist");
  }

  // Checking if the member trying to add others is owner of the project (others cannot add new members)
  const isOwner = existingProject.members.some(
    (member) =>
      member.user.toString() === req.user._id.toString() &&
      member.role === "owner",
  );

  if (!isOwner) {
    throw new ApiError(
      403,
      "You are not authorized to add members to this project",
    );
  }

  // Checking if member being added is already a part of the project
  const alreadyMember = existingProject.members.some(
    (member) => member.user.toString() === memberId,
  );

  if (alreadyMember) {
    throw new ApiError(
      409,
      "The member you are trying to add is already a part of this project",
    );
  }

  // Checking if the DB even contains any user with the received id
  const isInDb = await User.findById(memberId);

  if (!isInDb) {
    throw new ApiError(404, "User you are trying to add does not exist");
  }

  // Finally adding a new member
  existingProject.members.push({
    user: memberId,
    role: "member",
  });

  await existingProject.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member added successfully"));
});

// Controller for removing member from the project
const removeMember = asyncHandler(async (req, res) => {
  const { currentProjectId } = req.params;
  const { removeMemberId } = req.body;

  // Validating inputs
  if (!currentProjectId) {
    throw new ApiError(400, "Project id required");
  }

  if (!removeMemberId) {
    throw new ApiError(400, "Member id required");
  }

  // Checking if the project even exist
  const existingProject = await Project.findById(currentProjectId);

  if (!existingProject) {
    throw new ApiError(404, "Project does not exist");
  }

  // Checking if the member even exist in the project
  const isMember = existingProject.members.some(
    (member) => member.user.toString() === removeMemberId,
  );

  if (!isMember) {
    throw new ApiError(404, "Member not present in the project");
  }

  // Checking if the current member is the owner
  const isOwner = existingProject.members.some(
    (member) =>
      member.user.toString() === req.user._id.toString() &&
      member.role === "owner",
  );

  if (!isOwner) {
    throw new ApiError(403, "You are not authorized to remove a member");
  }

  // Preventing the owner from removing itself
  if (removeMemberId === req.user._id.toString()) {
    throw new ApiError(400, "Project owner cannot remove himself.");
  }

  // Removing the member
  existingProject.members = existingProject.members.filter(
    (member) => member.user.toString() !== removeMemberId,
  );

  await existingProject.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member removed successfully"));
});

export { createProject, addProjectMember, removeMember };
