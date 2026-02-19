import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Starting backgroun jobs
startInvitationExpiryJob();

// Global error handling middleware
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Express configuration
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Import routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import projectRouter from "./routes/project.route.js";
import invitationRouter from "./routes/invitation.routes.js";
import { startInvitationExpiryJob } from "../jobs/invitation-expiry.jobs.js";
import taskRouter from "./routes/task.routes.js";
app.use("/api/v1/healthcheck", healthCheckRouter); // Health check route: Returns the state of the API
app.use("/api/v1/users", authRouter); // Used for user related routes
app.use("/api/v1/admin", adminRouter); // Used for admin related routes
app.use("/api/v1/projects", projectRouter); // Used for project management related routes
app.use("/api/v1/invitations", invitationRouter); // Used for invitations realted routes
app.use("/api/v1/tasks", taskRouter); // Used for task related routes

app.get("/", (req, res) => {
  res.send({ status: "Ok" });
});

export default app;
