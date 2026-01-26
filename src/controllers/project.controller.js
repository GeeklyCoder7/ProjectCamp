import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { Project } from "../models/project.model.js";
import { getUserOrThrow } from "../utils/helpers.js";
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
    activities: [
      {
        type: "PROJECT_CREATED",
        performedBy: req.user._id,
        performedBySnapshot: {
          _id: req.user._id,
          userName: req.user.userName,
          email: req.user.email,
        },
      },
    ],
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
  const project = req.project;

  if (!memberId) {
    throw new ApiError(400, "New member's ID required");
  }

  // Checking if the DB even contains any user with the received id
  const user = await getUserOrThrow(memberId);

  // Checking if the member already exist
  if (project.hasMember(user._id)) {
    throw new ApiError(409, "Member already part of the project");
  }

  // Finally adding a new member
  project.members.push({
    user: user._id,
    role: "member",
  });

  // Adding the activity log
  project.addActivityLog({
    type: "MEMBER_ADDED",
    performedBy: req.user._id,
    performedBySnapshot: {
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
    },
    metadata: {
      addedMember: {
        _id: user._id,
        userName: user.userName,
        email: user.email,
      },
    },
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

  // Checking if the same user is trying to remove himself
  if (req.user._id.toString() === removeMemberId.toString()) {
    throw new ApiError(400, "You cannot remove yourself.");
  }

  // Removing the member
  project.removeMember(removeMemberId);

  // Fetching removed member details for snapshot purpose
  const removedMember =
    await User.findById(removeMemberId).select("_id userName email");

  // Adding the activity
  project.addActivityLog({
    type: "MEMBER_REMOVED",
    performedBy: req.user._id,
    metadata: {
      removedMember: {
        _id: removedMember._id,
        userName: removedMember.userName,
        email: removedMember.email,
      },
    },
  });

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

  // Storing old status for metadata
  const oldStatus = project.status;

  // Updating the project status
  project.status = newState;

  // Adding the activity log
  project.addActivityLog({
    type: "STATUS_UPDATED",
    performedBy: req.user._id,
    performedBySnapshot: {
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
    },
    metadata: {
      oldStatus: oldStatus,
      newStatus: newState,
    },
  });
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
  const project = await req.project.populate({
    path: "members.user",
    select: "userName email",
  }); // Coming from projectExistence middleware

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

// Controller for transferring project ownership
const transferOwnership = asyncHandler(async (req, res) => {
  const project = req.project;

  const { newOwnerId } = req.body;

  // Fetching the user from the DB to check if it exist
  const newOwner = await getUserOrThrow(newOwnerId);

  // Checking if the newOwner exist as a user and a part of the project
  if (!project.hasMember(newOwner._id)) {
    throw new ApiError(
      403,
      "Only existing members can be promoted to Owner",
    );
  }

  // Changing the owner
  project.changeOwner(newOwner._id);

  // Adding activity logs
  project.addActivityLog({
    type: "OWNERSHIP_TRANSFERRED",
    performedBy: req.user._id,
    performedBySnapshot: {
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
    },
    metadata: {
      oldOwner: {
        _id: req.user._id,
        userName: req.user.userName,
        email: req.user.email,
      },
      newOwner: {
        _id: newOwner._id,
        userName: newOwner.userName,
        email: newOwner.email,
      },
    },
  });

  await project.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        oldOwnerId: req.user._id.toString(),
        newOwnerId: newOwnerId,
      },
      "Ownership transferred successfully",
    ),
  );
});

// Controller for leaving from the project: Used by the member and prevents the owner to leave without transferring ownership
const leaveProject = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistence middleware
  const currentUserId = req.user._id; // Coming from verifyJwt middleware

  // Leaving the project
  project.leaveProject(currentUserId);

  // Adding the activity log
  project.addActivityLog({
    type: "MEMBER_LEFT",
    performedBy: currentUserId,
    performedBySnapshot: {
      _id: req.user._id,
      userName: req.user.userName,
      email: req.user.email,
    },
  });
  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Successfully left the project"));
});

// Controller for getting the project activities
const getProjectActivities = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistence middleware

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);

  // Fetching the logs
  const rawLogs = project.getActivityLogs();

  // Calculations for pagination
  const totalLogs = rawLogs.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // Formatting the logs
  const paginatedLogs = rawLogs.slice(startIndex, endIndex).map((log) => ({
    type: log.type,
    performedBy: log.performedBySnapshot
      ? {
          _id: log.performedBySnapshot._id,
          userName: log.performedBySnapshot.userName,
          email: log.performedBySnapshot.email,
        }
      : {},
    metadata: log.metadata ?? {},
    createdAt: log.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLogs,
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        limit,
        activities: paginatedLogs,
      },
      "Activity logs fetched successfully",
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
  transferOwnership,
  leaveProject,
  getProjectActivities,
};
