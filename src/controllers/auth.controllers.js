import { asyncHandler } from "../utils/async-handler.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { emailVerificationContent, sendEmail } from "../utils/mail.js";
import crypto from "crypto";

// Controller for registering as new user
const registerUser = asyncHandler(async (req, res) => {
  const { userName, email, password } = req.body;

  // Try to get the existing user from the db based on either email or userName
  const existingUser = await User.findOne({
    $or: [{ email }, { userName }],
  });

  // Check if the user exist
  if (existingUser) {
    throw new ApiError(409, "User with email or userName already exist", []);
  }

  // Create a new User if existingUser is null
  const newUser = await User.create({
    userName,
    email,
    password,
    isEmailVerified: false,
  });

  // Generating tokens
  const { unHashedToken, hashedToken, tokenExpiry } =
    newUser.generateTemporaryToken();

  // Adding tokens and expiry to the user object
  newUser.emailVerificationToken = hashedToken;
  newUser.emailVerificationExpiry = tokenExpiry;

  await newUser.save({ validateBeforeSave: false });

  // Verification link url
  const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/users/verify-email/${unHashedToken}`;

  // Sending the email
  await sendEmail({
    email: newUser.email,
    subject: "Verify your email",
    mailGenContent: emailVerificationContent(newUser.userName, verificationUrl),
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        userId: newUser._id,
        email: newUser.email,
      },
      "User registered successully. Please verify your email.",
    ),
  );
});

// Controller for verifying the email
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Missing verification token.");
  }

  // Hashing the current token passed in the url
  const currentHashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Checking if any user already exist in our db with the currentHashedToken and expiry greater than current time
  const user = await User.findOne({
    emailVerificationToken: currentHashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token.");
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully"));
});

// Controller for logging in the user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email & Password is required for login.", []);
  }

  // Finding the user with the received email
  const user = await User.findOne({ email: email });

  // Checking if the 'user' even exist or not
  if (!user) {
    throw new ApiError(401, "Email does not exist.", []);
  }

  // Checking if the email is even verified or not
  if (!user.isEmailVerified) {
    throw new ApiError(403, "Email is not verified, please verify it.", []);
  }

  // Generating tokens if everything above is verified
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: user._id,
          userName: user.userName,
          email: user.email,
        },
        accessToken,
        refreshToken,
      },
      "Login successful",
    ),
  );
});

export { registerUser, verifyEmail, login };
