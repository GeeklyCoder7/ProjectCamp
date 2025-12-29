import { Router } from "express";
import { login, registerUser, verifyEmail } from "../controllers/auth.controllers.js";

const authRouter = Router();
authRouter.post("/register", registerUser); // Used for /users/register
authRouter.post("/login", login); // Used for /users/register
authRouter.post("/verify-email/:token", verifyEmail); // Used for /users/verify-email/:token

export default authRouter;
