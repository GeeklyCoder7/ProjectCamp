import { Router } from "express";
import {
  changePassword,
  login,
  logout,
  refreshAccessToken,
  registerUser,
  verifyEmail,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const authRouter = Router();
authRouter.post("/register", registerUser); // Used for /users/register
authRouter.post("/login", login); // Used for /users/register
authRouter.post("/verify-email/:token", verifyEmail); // Used for /users/verify-email/:token
authRouter.post("/refresh-token", refreshAccessToken); // Used for regenerating the access token
authRouter.post("/logout", verifyJWT, logout); // Used for signing out the current logged in user
authRouter.post("/change-password", verifyJWT, changePassword); // Used for changing the password

// Temporary route for testing
authRouter.get("/me", verifyJWT, (req, res) => {
  return res.status(200).json({
    message: "You are authorized! Access granted!",
    data: req.user,
  });
});

export default authRouter;
