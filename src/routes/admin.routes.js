import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { authorizeRole } from "../middlewares/authorizeRole.middlewares.js";
import {
  blockUser,
  changeUserRole,
  deleteUser,
  getAllUsers,
  unblockUser,
} from "../controllers/admin.controllers.js";

const adminRouter = Router();

adminRouter.get("/users", verifyJWT, authorizeRole("admin"), getAllUsers); // Used for getting all the users

adminRouter.patch(
  "/users/:id/role",
  verifyJWT,
  authorizeRole("admin"),
  changeUserRole,
); // Used for changing the user roles

adminRouter.delete("/users/:id", verifyJWT, authorizeRole("admin"), deleteUser); // Used for deleting thze user

adminRouter.patch(
  "/users/:id/block",
  verifyJWT,
  authorizeRole("admin"),
  blockUser,
); // Used for blocking the user

adminRouter.patch(
  "/users/:id/unblock",
  verifyJWT,
  authorizeRole("admin"),
  unblockUser,
); // Used for un-blocking the user

export { adminRouter };
