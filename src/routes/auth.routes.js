import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  refreshAccessToken,
  registerUser,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const authRouter = Router();
authRouter.post("/register", registerUser); // Used for /users/register
authRouter.post("/login", login); // Used for /users/register
authRouter.get("/verify-email/:token", verifyEmail); // Used for /users/verify-email/:token
authRouter.post("/refresh-token", refreshAccessToken); // Used for regenerating the access token
authRouter.post("/logout", verifyJWT, logout); // Used for signing out the current logged in user
authRouter.patch("/change-password", verifyJWT, changePassword); // Used for changing the password
authRouter.post("/forgot-password", forgotPassword); // Used to send a password reset url
authRouter.patch("/reset-password/:token", resetPassword); // Used for actually resetting the password
authRouter.get("/me", verifyJWT, getCurrentUser); // Used to get the details of the currently logged in user

export default authRouter;
