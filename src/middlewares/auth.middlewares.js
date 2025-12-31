import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import jwt from "jsonwebtoken";

// Middleware to verify the JWT token
const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Checking if the header is present
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Unauthorized request: Token missing");
  }

  const token = authHeader.split(" ")[1];

  // Decoding and verifying the token
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expires JWT token.");
  }

  // Checking if any user with the token exist
  const user = await User.findOne({_id: decodedToken._id}).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;

  next();
});

export { verifyJWT };
