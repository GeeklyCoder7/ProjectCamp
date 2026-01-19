import mongoose, { Schema } from "mongoose";

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
  },
  {
    timestamps: true,
  },
);

// Checks if the specified user is the member of the curent project
projectSchema.methods.hasMember = function (userId) {
  return this.members.some(
    (member) => member.user.toString() === userId.toString(),
  );
};

// Checks if the specified user is the owner of the project
projectSchema.methods.isOwner = function (userId) {
  return this.members.some(
    (member) =>
      member.user.toString() === userId.toString() && member.role === "owner",
  );
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

export const Project = mongoose.model("Project", projectSchema);
