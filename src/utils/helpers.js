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
const checkAndParseDate = (dateStr, fieldName) => {
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

  return date;
};

export { getUserOrThrow, checkAndParseDate };
