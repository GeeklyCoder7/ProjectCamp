import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/api-error.js";

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

// Checks if the specified user is the member of the curent project
projectSchema.methods.hasMember = function (userId) {
  return this.members.some(
    (member) => member.user._id.toString() === userId.toString(),
  );
};

// Checks if the specified user is the owner of the project
projectSchema.methods.isOwner = function (userId) {
  return this.members.some(
    (member) =>
      member.user.toString() === userId.toString() && member.role === "owner",
  );
};

// Checks if the user can add a member
projectSchema.methods.addMember = function (userId) {
  if (this.hasMember(userId)) {
    throw new ApiError();
  }
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
projectSchema.methods.removeMember = function (removeMemberId) {
  if (this.isOwner(removeMemberId)) {
    throw new ApiError(
      400,
      "Owner cannot remove himself"
    )
  }

  this.members = this.members.filter(
    (member) => member.user.toString() !== removeMemberId.toString(),
  );
};

// Returns all the members of the project
projectSchema.methods.getMembers = function () {
  return this.members;
};

// Changes the owner
projectSchema.methods.changeOwner = function (newOwnerId) {
  // Checking if current owner and new owner (to be) are both the same
  if (this.isOwner(newOwnerId)) {
    throw new ApiError(409, "User is alread the owner of this project");
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
};

// Performs the leave operation for the current user
projectSchema.methods.leaveProject = function (currentUserId) {
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
  this.removeMember(currentUserId);
};

// Adds the activity to the project logs
projectSchema.methods.addActivityLog = function ({
  type,
  performedBy,
  metadata = {},
}) {
  this.activities.push({
    type,
    performedBy,
    metadata,
  });
};

export const Project = mongoose.model("Project", projectSchema);
