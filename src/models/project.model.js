import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

const projectMemberScehma = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["member", "owner"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const projectActivitySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "PROJECT_CREATED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
        "STATUS_UPDATED",
        "MEMBER_LEFT",
        "OWNERSHIP_TRANSFERRED",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedBySnapshot: {
      // Sapshot of the user that performed this activity: Used for display formatting
      _id: mongoose.Schema.Types.ObjectId,
      userName: String,
      email: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const projectSchema = new Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "inactive"],
      default: "active",
    },
    description: {
      type: String,
      trim: true,
    },
    projectOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [projectMemberScehma],
      default: [],
    },
    activities: {
      type: [projectActivitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Creates and returns a new project
projectSchema.statics.createProject = async function ({
  owner,
  projectName,
  description,
}) {
  const newProject = await this.create({
    projectName,
    status: "active",
    description,
    projectOwner: owner._id,
    members: [
      {
        user: owner._id,
        role: "owner",
      },
    ],
    activities: [
      {
        type: "PROJECT_CREATED",
        performedBy: owner._id,
        performedBySnapshot: {
          _id: owner._id,
          userName: owner.userName,
          email: owner.email,
        },
      },
    ],
  });

  return newProject;
};

// Checks if the specified user is the member of the curent project
projectSchema.methods.hasMember = function (userId) {
  return this.members.some((member) => {
    const memberId =
      typeof member.user == "object" ? member.user._id : member.user;

    return memberId.toString() === userId.toString();
  });
};

// Checks if the specified user is the owner of the project
projectSchema.methods.isOwner = function (userId) {
  return this.members.some(
    (member) =>
      member.user.toString() === userId.toString() && member.role === "owner",
  );
};

// Adds new member and logs the activity
projectSchema.methods.addMember = function ({
  userId,
  performedBy,
  performedBySnapshot,
  metadata,
}) {
  if (this.hasMember(userId)) {
    throw new ApiError(409, "Member already exists");
  }

  this.members.push({
    user: userId,
    role: "member",
  });

  this.addActivityLog({
    type: "MEMBER_ADDED",
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

// Checks if the project is active
projectSchema.methods.isActive = function () {
  return this.status === "active";
};

// Checks if the project is completed
projectSchema.methods.isCompleted = function () {
  return this.status === "completed";
};

// Checks if the the project can be transitioned to the next status
projectSchema.methods.canTransitionTo = function (newStatus) {
  const allowedTransitions = {
    active: ["inactive", "completed"],
    inactive: ["active", "completed"],
    completed: [],
  };

  return allowedTransitions[this.status]?.includes(newStatus);
};

// Removes the specified member
projectSchema.methods.removeMember = function ({
  removeMemberId,
  performedBy,
  performedBySnapshot,
  metadata,
}) {
  if (this.isOwner(removeMemberId)) {
    throw new ApiError(400, "Owner cannot remove himself");
  }
  this._removeMemberInternal(removeMemberId);

  this.addActivityLog({
    type: "MEMBER_REMOVED",
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

// Returns all the members of the project
projectSchema.methods.getMembers = function () {
  return this.members;
};

// Updates the status of the project
projectSchema.methods.updateStatus = function ({
  newStatus,
  performedBy,
  performedBySnapshot,
  metadata,
}) {
  // Checkig if project can be transitioned to the specified state
  if (!this.canTransitionTo(newStatus)) {
    throw new ApiError(409, "Project cannot be transitioned to this state");
  }

  this.status = newStatus; // Updating to new status

  this.addActivityLog({
    type: "STATUS_UPDATED",
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

// Changes the owner
projectSchema.methods.changeOwner = function ({
  newOwnerId,
  performedBy,
  performedBySnapshot,
  metadata,
}) {
  // Checking if current owner and new owner (to be) are both the same
  if (this.isOwner(newOwnerId)) {
    throw new ApiError(409, "User is alread the owner of this project");
  }

  // Checking if the newOwner exist as a user and a part of the project
  if (!this.hasMember(newOwnerId)) {
    throw new ApiError(403, "Only existing members can be promoted to Owner");
  }

  // Demoting the current owner to "member"
  this.members.forEach((member) => {
    if (member.role === "owner") {
      member.role = "member";
    }
  });

  // Promoting the new owner
  this.members.forEach((member) => {
    if (member.user.toString() === newOwnerId.toString()) {
      member.role = "owner";
    }
  });

  this.addActivityLog({
    type: "OWNERSHIP_TRANSFERRED",
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

// Performs the leave operation for the current user
projectSchema.methods.leaveProject = function ({
  currentUserId,
  performedBy,
  performedBySnapshot,
  metadata,
}) {
  // Checking if the user is the member of the project
  if (!this.hasMember(currentUserId)) {
    throw new ApiError(403, "User is not the member of the project");
  }

  // Checking if the user is the owner of the project
  if (this.isOwner(currentUserId)) {
    throw new ApiError(
      409,
      "Owner cannot leave directly, you must transfer the ownership first",
    );
  }

  // Removing the member from the project
  this._removeMemberInternal(currentUserId);

  // Adding activity-logs
  this.addActivityLog({
    type: "MEMBER_LEFT",
    performedBy,
    performedBySnapshot,
    metadata: metadata ?? null,
  });
};

// Adds the activity to the project logs
projectSchema.methods.addActivityLog = function ({
  type,
  performedBy,
  performedBySnapshot,
  metadata = {},
}) {
  this.activities.push({
    type,
    performedBy,
    performedBySnapshot,
    metadata,
  });
};

// Returns the project activity logs
projectSchema.methods.getActivityLogs = function (type) {
  if (!type || type === undefined || type === null) {
    return this.activities;
  } else {
    return this.activities.filter((activity) => type.includes(activity.type));
  }
};

// Only removes the member: Used by different methods that require member removal with distint operations
projectSchema.methods._removeMemberInternal = function (removeMemberId) {
  this.members = this.members.filter(
    (member) => member.user.toString() !== removeMemberId.toString(),
  );
};

export const Project = mongoose.model("Project", projectSchema);
