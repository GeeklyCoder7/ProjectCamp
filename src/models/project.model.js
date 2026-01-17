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
      eum: ["active", "completed", "inprogress"],
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

export const Project = mongoose.model("Project", projectSchema);
