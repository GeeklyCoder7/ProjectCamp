import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { Project } from "../models/project.model.js";
import {
  checkAndParseDate,
  getUserByEmailOrThrow,
  getUserOrThrow,
} from "../utils/helpers.js";
import { User } from "../models/user.models.js";
import { ProjectInvitation } from "../models/invitation.model.js";
import { ProjectInvitationExpiryLimit } from "../utils/constants.js";

// Controller for creating a new project
const createProject = asyncHandler(async (req, res) => {
  const { projectName, description } = req.body;

  if (!projectName) {
    throw new ApiError(400, "Project name is requried");
  }

  const newProject = await Project.createProject({
    owner: req.user,
    projectName,
    description,
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

  // Creating activity-log related values
  const performedBy = req.user._id;

  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };

  const metadata = {
    addedMember: {
      _id: user._id,
      userName: user.userName,
      email: user.email,
    },
  };

  project.addMember({
    userId: user._id,
    performedBy,
    performedBySnapshot,
    metadata,
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

  // Fetching removed member details for snapshot purpose
  const removedMember =
    await User.findById(removeMemberId).select("_id userName email");

  if (!removeMember) {
    throw new ApiError(404, "User not found");
  }

  // Creating values for activity logs
  const performedBy = req.user._id;
  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };
  const metadata = {
    removedMember: {
      _id: removeMemberId,
      userName: removedMember.userName,
      email: removedMember.email,
    },
  };

  // Removing the member
  project.removeMember({
    removeMemberId: removeMemberId,
    performedBy,
    performedBySnapshot,
    metadata,
  });

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Member removed successfully"));
});

// Controller for updating project state
const updateProjectState = asyncHandler(async (req, res) => {
  const { currentProjectId } = req.params;
  const { newStatus } = req.body;
  const project = req.project;

  // Validating inputs
  if (!currentProjectId) {
    throw new ApiError(400, "Project id is required");
  }

  if (!newStatus) {
    throw new ApiError(400, "New state is required");
  }

  // Storing old status for metadata
  const oldStatus = project.status;

  // Creating values for activity logs
  const performedBy = req.user._id;
  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };
  const metadata = {
    oldStatus: oldStatus,
    newStatus: newStatus,
  };

  // Updating the status
  project.updateStatus({
    newStatus,
    performedBy,
    performedBySnapshot,
    metadata,
  });

  await project.save();

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

  // Creating values for activity-logs
  const performedBy = req.user._id;

  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };

  const metadata = {
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
  };

  // Changing the owner
  project.changeOwner({
    newOwnerId,
    performedBy,
    performedBySnapshot,
    metadata,
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

  // Preparing values for adding activity-logs
  const performedBy = currentUserId;

  const performedBySnapshot = {
    _id: req.user._id,
    userName: req.user.userName,
    email: req.user.email,
  };

  // Leaving the project
  project.leaveProject({
    currentUserId,
    performedBy,
    performedBySnapshot,
  });

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Successfully left the project"));
});

// Controller for getting the project activities
const getProjectActivities = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistence middleware
  const type = req.query.type?.split(",").map((t) => t.trim()); // Coming from request parameters
  const sort = req.query.sort;
  const from = checkAndParseDate(req.params.from, "from"); // Converting the date string to Date object for comparision and filtering
  const to = checkAndParseDate(req.params.to, "to", true);

  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);

  const { activities, totalLength } = project.getActivitiesPaginated({
    type,
    from,
    to,
    page,
    limit,
    sort,
  });

  const formattedActivities = activities.map((activity) => ({
    type: activity.type,
    performedBy: activity.performedBySnapshot,
    metadata: activity.metadata ?? null,
    createdAt: activity.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalLength,
        currentPage: page,
        totalPages: Math.ceil(totalLength / limit),
        limit,
        activities: formattedActivities,
      },
      "Activity logs fetched successfully",
    ),
  );
});

// Controller for sending invitation to the user
const sendInvitation = asyncHandler(async (req, res) => {
  const project = req.project; // Coming from projectExistenceMiddleware
  const { email } = req.body; // Email of the user to whom this invite will be sent

  // Validating inputs
  if (!email) {
    throw new ApiError(400, "Email required for inviting the member");
  }

  // Fetching the user by email
  const invitedUser = await getUserByEmailOrThrow(email);

  // Checking if the invited user is already a member of the current project
  if (project.hasMember(invitedUser._id)) {
    throw new ApiError(409, "User is already a member of the project");
  }

  // Checking if the user can be invited
  const canInvite = await ProjectInvitation.canInviteUser({
    projectId: project._id,
    userId: invitedUser._id,
  });

  if (!canInvite) {
    throw new ApiError(400, "Cannot invite this user");
  }

  // Calculating the expiry date
  const expiresAt = new Date(); // First take the current date
  expiresAt.setDate(expiresAt.getDate() + ProjectInvitationExpiryLimit); // Adding the expiry limit to the current date

  // Creating invitation
  const newInvitation = await ProjectInvitation.create({
    projectId: project._id,
    invitedUser: invitedUser._id,
    invitedBy: req.user._id,
    role: "member",
    invitationStatus: "pending",
    expiresAt,
  });

  // Sending the response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        invitationId: newInvitation._id,
        invitedUser: invitedUser._id,
        expiresAt: expiresAt,
      },
      "Invitation sent successfully.",
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
  sendInvitation,
};
