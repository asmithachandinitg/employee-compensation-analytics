
import express from "express";
import cors from "cors";
import employeeRoutes from "./routes/employees";
import dashboardRoutes from "./routes/dashboard";
import compensationRoutes from "./routes/compensation";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/compensation", compensationRoutes);

// Health check API
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Employee Compensation & Analytics API is running",
    timestamp: new Date().toISOString(),
  });
});

export default app;
