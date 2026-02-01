import { ProjectInvitation } from "../models/invitation.model.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "./api-error.js";

// Checks if the user exists in the DB
const getUserOrThrow = async function (userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

// Checks if the passed date is in the correct format: "YYYY-MM-DD"
const checkAndParseDate = (dateStr, fieldName, isEndDate = false) => {
  // If not provided, that means no filtering
  if (!dateStr) return null;

  // Enforcing strict YYYY-MM-DD format check
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoDateRegex.test(dateStr)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }

  // Converting to the date
  const date = new Date(dateStr);

  // Validating actual date value
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Invalid ${fieldName} value`);
  }

  // Converting the date to the end of the day is it's the "to" or "end" date
  if (isEndDate) {
    date = date.setDate(date.getDate() + 1); // Adding one day extra
  }

  return date;
};

// Fetches user by email or throw the error if not exists
const getUserByEmailOrThrow = async function (email) {
  // Trying to fetch the user
  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

// Fetches the invitation or throws the error if not exists
const getInvitationOrThrow = async function (invitationId) {
  const invitation = await ProjectInvitation.findById(invitationId);

  if (!invitation) {
    throw new ApiError(404, "Invitation not found");
  }

  return invitation;
};

// Fetches the project or throws the error if not exists
const getProjectOrThrow = async function (projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project does not exists");
  }

  return project;
};

export {
  getUserOrThrow,
  checkAndParseDate,
  getUserByEmailOrThrow,
  getInvitationOrThrow,
  getProjectOrThrow,
};
