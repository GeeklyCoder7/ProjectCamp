import { ApiError } from "../utils/api-error.js";

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "User not authenticated");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        "You don't have permission to perform this action",
      );
    }

    next();
  };
};

export { authorizeRole };
