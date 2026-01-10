// Controller for getting all users from DB

import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// Controller for getting all users
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, users, "All users fetched successfully"));
});

// Controller for deleting a user
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  await existingUser.deleteOne(); // Deleting the user

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

// Controller for changing the user role
const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newRole } = req.body;

  // Checking if the new role is valid
  if (!["user", "admin"].includes(newRole)) {
    throw new ApiError(400, "Invalid role");
  }

  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  existingUser.role = newRole; // Updating the role
  await existingUser.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        newRole: existingUser.role,
      },
      "Role updated successfully",
    ),
  );
});

// Controller for blocking the user
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingUser = await User.findById(id); // Trying to fetch the existing user

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  // Admin cannot block itself
  if (req.user._id.equals(existingUser._id)) {
    throw new ApiError(400, "You cannot block yourself");
  }

  if (existingUser.isBlocked) {
    throw new ApiError(403, "User already blocked");
  }

  existingUser.isBlocked = true;
  await existingUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User successfully blocked."));
});

// Controller for un-blocking the blocked user
const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingUser = await User.findById(id);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  if (!existingUser.isBlocked) {
    throw new ApiError(403, "User already unblocked.");
  }

  existingUser.isBlocked = false;
  await existingUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User successfully unblocked."));
});

export { deleteUser, changeUserRole, getAllUsers, blockUser, unblockUser };
