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

export { getUserOrThrow };
